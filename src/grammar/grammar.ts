import rawGrammar from './grammar.ohm-bundle';
import { ASTContractAttribute, ASTFunctionAttribute, ASTNode, ASTProgram, ASTTypeRef, createNode, createRef, throwError } from './ast';
import { checkVariableName } from './checkVariableName';
import { resolveConstantValue } from '../types/resolveConstantValue';
import { resolveTypeRef, resolveTypeRefUnsafe } from '../types/resolveDescriptors';


// Semantics
const semantics = rawGrammar.createSemantics();

// Resolve program
semantics.addOperation<ASTNode>('resolve_program', {
    Program(arg0) {
        return createNode({
            kind: 'program',
            entries: arg0.children.map((v) => v.resolve_program_item())
        });
    },
});

// Resolve program items
semantics.addOperation<ASTNode>('resolve_program_item', {
    ProgramImport(arg0, arg1, arg2) {
        return createNode({
            kind: 'program_import',
            path: arg1.resolve_expression(),
            ref: createRef(this)
        });
    },
    Primitive(arg0, arg1, arg2) {
        checkVariableName(arg1.sourceString, createRef(arg1));
        return createNode({
            kind: 'primitive',
            name: arg1.sourceString,
            ref: createRef(this)
        });
    },
    Struct_originary(arg0, arg1, arg2, arg3, arg4) {
        checkVariableName(arg1.sourceString, createRef(arg1));
        return createNode({
            kind: 'def_struct',
            name: arg1.sourceString,
            fields: arg3.children.map((v) => v.resolve_declaration()),
            prefix: null,
            message: false,
            ref: createRef(this)
        })
    },
    Struct_message(arg0, arg1, arg2, arg3, arg4) {
        checkVariableName(arg1.sourceString, createRef(arg1));
        return createNode({
            kind: 'def_struct',
            name: arg1.sourceString,
            fields: arg3.children.map((v) => v.resolve_declaration()),
            prefix: null,
            message: true,
            ref: createRef(this)
        })
    },
    Struct_messageWithId(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
        checkVariableName(arg1.sourceString, createRef(arg1));
        return createNode({
            kind: 'def_struct',
            name: arg4.sourceString,
            fields: arg6.children.map((v) => v.resolve_declaration()),
            prefix: parseInt(arg2.sourceString),
            message: true,
            ref: createRef(this)
        })
    },
    Contract_simple(arg0, arg1, arg2, arg3, arg4, arg5) {
        checkVariableName(arg2.sourceString, createRef(arg2));
        return createNode({
            kind: 'def_contract',
            name: arg2.sourceString,
            attributes: arg0.children.map((v: any) => v.resolve_contract_attributes()),
            declarations: arg4.children.map((v) => v.resolve_declaration()),
            traits: [],
            ref: createRef(this)
        })
    },
    Contract_withTraits(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
        checkVariableName(arg2.sourceString, createRef(arg2));
        return createNode({
            kind: 'def_contract',
            name: arg2.sourceString,
            attributes: arg0.children.map((v: any) => v.resolve_contract_attributes()),
            declarations: arg6.children.map((v) => v.resolve_declaration()),
            traits: arg4.asIteration().children.map((v: any) => v.resolve_expression()),
            ref: createRef(this)
        })
    },
    Trait_originary(arg0, arg1, arg2, arg3, arg4, arg5) {
        checkVariableName(arg2.sourceString, createRef(arg2));
        return createNode({
            kind: 'def_trait',
            name: arg2.sourceString,
            attributes: arg0.children.map((v: any) => v.resolve_contract_attributes()),
            declarations: arg4.children.map((v) => v.resolve_declaration()),
            traits: [],
            ref: createRef(this)
        })
    },
    Trait_withTraits(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
        checkVariableName(arg2.sourceString, createRef(arg2));
        return createNode({
            kind: 'def_trait',
            name: arg2.sourceString,
            attributes: arg0.children.map((v: any) => v.resolve_contract_attributes()),
            declarations: arg6.children.map((v) => v.resolve_declaration()),
            traits: arg4.asIteration().children.map((v: any) => v.resolve_expression()),
            ref: createRef(this)
        })
    },
    StaticFunction(arg0) {
        return arg0.resolve_declaration();
    },
    NativeFunction(arg0) {
        return arg0.resolve_declaration();
    },
});

// Resolve attributes
semantics.addOperation<ASTFunctionAttribute>('resolve_attributes', {
    FunctionAttribute_public(arg0) {
        return { type: 'public', ref: createRef(this) };
    },
    FunctionAttribute_getter(arg0) {
        return { type: 'get', ref: createRef(this) };
    },
    FunctionAttribute_extends(arg0) {
        return { type: 'extends', ref: createRef(this) };
    },
    FunctionAttribute_mutates(arg0) {
        return { type: 'mutates', ref: createRef(this) };
    },
    FunctionAttribute_overwrites(arg0) {
        return { type: 'overwrites', ref: createRef(this) };
    },
    FunctionAttribute_virtual(arg0) {
        return { type: 'virtual', ref: createRef(this) };
    },
});

// Resolve contract
semantics.addOperation<ASTContractAttribute>('resolve_contract_attributes', {
    ContractAttribute_interface(arg0, arg1, arg2, arg3) {
        return { type: 'interface', name: arg2.resolve_expression(), ref: createRef(this) };
    }
});

// Struct and class declarations
semantics.addOperation<ASTNode>('resolve_declaration', {
    Field_default(arg0, arg1, arg2, arg3) {
        return createNode({
            kind: 'def_field',
            name: arg0.sourceString,
            type: arg2.resolve_expression(),
            as: null,
            init: null,
            ref: createRef(this)
        })
    },
    Field_defaultWithInit(arg0, arg1, arg2, arg3, arg4, arg5) {
        let tr = (arg2.resolve_expression() as ASTTypeRef);
        return createNode({
            kind: 'def_field',
            name: arg0.sourceString,
            type: tr,
            as: null,
            init: arg4.resolve_expression(),
            ref: createRef(this)
        })
    },
    Field_withSerialization(arg0, arg1, arg2, arg3, arg4, arg5) {
        return createNode({
            kind: 'def_field',
            name: arg0.sourceString,
            type: arg2.resolve_expression(),
            as: arg4.sourceString,
            init: null,
            ref: createRef(this)
        })
    },
    Field_withSerializationAndInit(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
        let tr = (arg2.resolve_expression() as ASTTypeRef);
        return createNode({
            kind: 'def_field',
            name: arg0.sourceString,
            type: tr,
            as: arg4.sourceString,
            init: arg6.resolve_expression(),
            ref: createRef(this)
        })
    },
    Constant(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        return createNode({
            kind: 'def_constant',
            name: arg1.sourceString,
            type: arg3.resolve_expression(),
            value: arg5.resolve_expression(),
            ref: createRef(this)
        })
    },
    FunctionArg(arg0, arg1, arg2) {
        checkVariableName(arg0.sourceString, createRef(arg0));
        return createNode({
            kind: 'def_argument',
            name: arg0.sourceString,
            type: arg2.resolve_expression(),
            ref: createRef(this)
        })
    },
    Function_withType(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
        checkVariableName(arg2.sourceString, createRef(arg2));
        return createNode({
            kind: 'def_function',
            attributes: arg0.children.map((v: any) => v.resolve_attributes()),
            name: arg2.sourceString,
            return: arg7.resolve_expression(),
            args: arg4.asIteration().children.map((v: any) => v.resolve_declaration()),
            statements: arg9.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
    Function_withVoid(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
        checkVariableName(arg2.sourceString, createRef(arg2));
        return createNode({
            kind: 'def_function',
            attributes: arg0.children.map((v: any) => v.resolve_attributes()),
            name: arg2.sourceString,
            return: null,
            args: arg4.asIteration().children.map((v: any) => v.resolve_declaration()),
            statements: arg7.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
    NativeFunction_withType(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10, arg11, arg12) {
        checkVariableName(arg5.sourceString, createRef(arg5));
        return createNode({
            kind: 'def_native_function',
            attributes: arg4.children.map((v: any) => v.resolve_attributes()),
            name: arg6.sourceString,
            nativeName: arg2.sourceString,
            return: arg11.resolve_expression(),
            args: arg8.asIteration().children.map((v: any) => v.resolve_declaration()),
            ref: createRef(this)
        })
    },
    NativeFunction_withVoid(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
        checkVariableName(arg5.sourceString, createRef(arg5));
        return createNode({
            kind: 'def_native_function',
            attributes: arg4.children.map((v: any) => v.resolve_attributes()),
            name: arg6.sourceString,
            nativeName: arg2.sourceString,
            return: null,
            args: arg8.asIteration().children.map((v: any) => v.resolve_declaration()),
            ref: createRef(this)
        })
    },
    ContractInit(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        return createNode({
            kind: 'def_init_function',
            args: arg2.asIteration().children.map((v: any) => v.resolve_declaration()),
            statements: arg5.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
    ReceiveFunction_simple(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        return createNode({
            kind: 'def_receive',
            selector: { kind: 'simple', arg: arg2.resolve_declaration() },
            statements: arg5.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
    ReceiveFunction_empty(arg0, arg1, arg2, arg3, arg4, arg5) {
        return createNode({
            kind: 'def_receive',
            selector: { kind: 'fallback' },
            statements: arg4.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
    ReceiveFunction_comment(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        return createNode({
            kind: 'def_receive',
            selector: { kind: 'comment', comment: arg2.resolve_expression() },
            statements: arg5.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
    ReceiveFunction_bounced(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        return createNode({
            kind: 'def_receive',
            selector: { kind: 'bounce', arg: arg2.resolve_declaration() },
            statements: arg5.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
});

// Statements
semantics.addOperation<ASTNode>('resolve_statement', {
    StatementLet(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        checkVariableName(arg1.sourceString, createRef(arg1));

        return createNode({
            kind: 'statement_let',
            name: arg1.sourceString,
            type: arg3.resolve_expression(),
            expression: arg5.resolve_expression(),
            ref: createRef(this)
        })
    },
    StatementReturn_withExpression(arg0, arg1, arg2) {
        return createNode({
            kind: 'statement_return',
            expression: arg1.resolve_expression(),
            ref: createRef(this)
        })
    },
    StatementReturn_withoutExpression(arg0, arg1) {
        return createNode({
            kind: 'statement_return',
            expression: null,
            ref: createRef(this)
        })
    },
    StatementExpression(arg0, arg1) {
        return createNode({
            kind: 'statement_expression',
            expression: arg0.resolve_expression(),
            ref: createRef(this)
        })
    },
    StatementAssign(arg0, arg1, arg2, arg3) {
        return createNode({
            kind: 'statement_assign',
            path: arg0.resolve_lvalue(),
            expression: arg2.resolve_expression(),
            ref: createRef(this)
        })
    },
    StatementCondition_simple(arg0, arg1, arg2, arg3, arg4) {
        return createNode({
            kind: 'statement_condition',
            expression: arg1.resolve_expression(),
            trueStatements: arg3.children.map((v: any) => v.resolve_statement()),
            falseStatements: [],
            elseif: null,
            ref: createRef(this)
        })
    },
    StatementCondition_withElse(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
        return createNode({
            kind: 'statement_condition',
            expression: arg1.resolve_expression(),
            trueStatements: arg3.children.map((v: any) => v.resolve_statement()),
            falseStatements: arg7.children.map((v: any) => v.resolve_statement()),
            elseif: null,
            ref: createRef(this)
        })
    },
    StatementCondition_withElseIf(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        return createNode({
            kind: 'statement_condition',
            expression: arg1.resolve_expression(),
            trueStatements: arg3.children.map((v: any) => v.resolve_statement()),
            falseStatements: [],
            elseif: arg6.resolve_statement(),
            ref: createRef(this)
        })
    },
    StatementWhile(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        return createNode({
            kind: 'statement_while',
            condition: arg2.resolve_expression(),
            statements: arg5.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
    StatementRepeat(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        return createNode({
            kind: 'statement_repeat',
            condition: arg2.resolve_expression(),
            statements: arg5.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
    StatementUntil(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
        return createNode({
            kind: 'statement_until',
            condition: arg6.resolve_expression(),
            statements: arg2.children.map((v: any) => v.resolve_statement()),
            ref: createRef(this)
        })
    },
});

// LValue
semantics.addOperation<ASTNode[]>('resolve_lvalue', {
    LValue_single(arg0) {
        return [createNode({
            kind: 'lvalue_ref',
            name: arg0.sourceString,
            ref: createRef(this)
        })];
    },
    LValue_more(arg0, arg1, arg2) {
        return [createNode({
            kind: 'lvalue_ref',
            name: arg0.sourceString,
            ref: createRef(this)
        }), ...arg2.resolve_lvalue()];
    }
});

// Expressions
semantics.addOperation<ASTNode>('resolve_expression', {

    // Literals
    integerLiteral(n) {
        return createNode({ kind: 'number', value: BigInt(n.sourceString), ref: createRef(this) }); // Parses dec-based integer and hex-based integers
    },
    boolLiteral(arg0) {
        return createNode({ kind: 'boolean', value: arg0.sourceString === 'true', ref: createRef(this) });
    },
    id(arg0, arg1) {
        return createNode({ kind: 'id', value: arg0.sourceString + arg1.sourceString, ref: createRef(this) });
    },
    funcId(arg0, arg1) {
        return createNode({ kind: 'id', value: arg0.sourceString + arg1.sourceString, ref: createRef(this) });
    },
    null(arg0) {
        return createNode({ kind: 'null', ref: createRef(this) });
    },
    stringLiteral(arg0, arg1, arg2) {
        return createNode({ kind: 'string', value: arg1.sourceString, ref: createRef(this) });
    },

    // TypeRefs
    Type_optional(arg0, arg1) {
        return createNode({ kind: 'type_ref_simple', name: arg0.sourceString, optional: true, ref: createRef(this) });
    },
    Type_required(arg0) {
        return createNode({ kind: 'type_ref_simple', name: arg0.sourceString, optional: false, ref: createRef(this) });
    },
    Type_map(arg0, arg1, arg2, arg3, arg4) {
        return createNode({ kind: 'type_ref_map', key: arg2.sourceString, value: arg4.sourceString, ref: createRef(this) });
    },

    // Binary
    ExpressionAdd_add(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '+', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionAdd_sub(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '-', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionMul_div(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '/', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionMul_mul(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '*', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionMul_rem(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '%', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionCompare_eq(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '==', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionCompare_not(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '!=', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionCompare_gt(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '>', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionCompare_gte(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '>=', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionCompare_lt(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '<', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionCompare_lte(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '<=', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionOr_or(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '||', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionAnd_and(arg0, arg1, arg2) {
        return createNode({ kind: 'op_binary', op: '&&', left: arg0.resolve_expression(), right: arg2.resolve_expression(), ref: createRef(this) });
    },

    // Unary
    ExpressionUnary_add(arg0, arg1) {
        return createNode({ kind: 'op_unary', op: '+', right: arg1.resolve_expression(), ref: createRef(this) });
    },
    ExpressionUnary_neg(arg0, arg1) {
        return createNode({ kind: 'op_unary', op: '-', right: arg1.resolve_expression(), ref: createRef(this) });
    },
    ExpressionUnary_not(arg0, arg1) {
        return createNode({ kind: 'op_unary', op: '!', right: arg1.resolve_expression(), ref: createRef(this) });
    },
    ExpressionBracket(arg0, arg1, arg2) {
        return arg1.resolve_expression();
    },
    ExpressionUnarySuffix_notNull(arg0, arg1) {
        return createNode({ kind: 'op_unary', op: '!!', right: arg0.resolve_expression(), ref: createRef(this) });
    },

    // Access
    ExpressionField(arg0, arg1, arg2) {
        return createNode({ kind: 'op_field', src: arg0.resolve_expression(), name: arg2.sourceString, ref: createRef(this) });
    },
    ExpressionCall(arg0, arg1, arg2, arg3, arg4, arg5) {
        return createNode({ kind: 'op_call', src: arg0.resolve_expression(), name: arg2.sourceString, args: arg4.asIteration().children.map((v: any) => v.resolve_expression()), ref: createRef(this) });
    },
    ExpressionStaticCall(arg0, arg1, arg2, arg3) {
        return createNode({ kind: 'op_static_call', name: arg0.sourceString, args: arg2.asIteration().children.map((v: any) => v.resolve_expression()), ref: createRef(this) });
    },
    ExpressionNew(arg0, arg1, arg2, arg3) {
        return createNode({ kind: 'op_new', type: arg0.sourceString, args: arg2.asIteration().children.map((v: any) => v.resolve_expression()), ref: createRef(this) });
    },
    NewParameter(arg0, arg1, arg2) {
        return createNode({ kind: 'new_parameter', name: arg0.sourceString, exp: arg2.resolve_expression(), ref: createRef(this) });
    },
    ExpressionInitOf(arg0, arg1, arg2, arg3, arg4) {
        return createNode({ kind: 'init_of', name: arg1.sourceString, args: arg3.asIteration().children.map((v: any) => v.resolve_expression()), ref: createRef(this) });
    },
});

export function parse(src: string): ASTProgram {
    let matchResult = rawGrammar.match(src);
    if (matchResult.failed()) {
        throw new Error(matchResult.message);
    }
    let res = semantics(matchResult).resolve_program();
    return res;
}

export function parseImports(src: string): string[] {
    let r = parse(src);
    let imports: string[] = [];
    let hasExpression = false;
    for (let e of r.entries) {
        if (e.kind === 'program_import') {
            if (hasExpression) {
                throwError('Import must be at the top of the file', e.ref);
            }
            imports.push(e.path.value);
        } else {
            hasExpression = true;
        }
    }
    return imports;
}