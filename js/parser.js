/**
 * CAV Script Parser
 * Recursive descent parser for the CAV scripting language
 * Based on the grammar from the original Java implementation
 */

import { TokenType, Tokenizer } from './tokenizer.js';

// Built-in functions
const BUILTIN_FUNCTIONS = {
    'abs': (args) => Math.abs(args[0]),
    'cos': (args) => Math.cos(args[0]),
    'sin': (args) => Math.sin(args[0]),
    'tan': (args) => Math.tan(args[0]),
    'exp': (args) => Math.exp(args[0]),
    'sqrt': (args) => Math.sqrt(args[0]),
    'int': (args) => Math.round(args[0]),
    'pow': (args) => Math.pow(args[0], args[1]),
    'min': (args) => Math.min(args[0], args[1]),
    'max': (args) => Math.max(args[0], args[1]),
    'random': () => Math.random()
};

// Built-in constants
const CONSTANTS = {
    'pi': Math.PI,
    'e': Math.E
};

export class ScriptParser {
    constructor(source) {
        this.source = source;
        this.tokens = [];
        this.pos = 0;
        this.variables = {};
        this.staticVariables = {};
        this.params = []; // Parameters defined by #define_param
        this.errors = [];
    }

    /**
     * Parse and execute the script
     * @param {Object} context - Contains 'rate' and 'traffic' values
     * @returns {Object} - Updated context with new rate value
     */
    parse(context = {}) {
        // Reset state
        this.pos = 0;
        this.errors = [];

        // Initialize predefined variables
        this.variables = { ...context };

        // Add constants
        for (const [name, value] of Object.entries(CONSTANTS)) {
            this.variables[name] = value;
        }

        // Merge static variables
        for (const [name, value] of Object.entries(this.staticVariables)) {
            this.variables[name] = value;
        }

        // Tokenize
        const tokenizer = new Tokenizer(this.source);
        try {
            this.tokens = tokenizer.tokenize();
        } catch (e) {
            this.errors.push(e.message);
            return context;
        }

        // First pass: process preprocessor directives
        this.processPreprocessor();

        // Second pass: execute statements
        try {
            while (!this.isAtEnd()) {
                this.statement();
            }
        } catch (e) {
            this.errors.push(e.message);
        }

        // Save static variables back
        for (const param of this.params.filter(p => p.isStatic)) {
            this.staticVariables[param.name] = this.variables[param.name];
        }

        return {
            rate: this.variables.rate || 0,
            errors: this.errors
        };
    }

    /**
     * Get parameters defined by #define_param
     */
    getParams() {
        return this.params;
    }

    /**
     * Set a variable value (used for parameter sliders)
     */
    setVariable(name, value) {
        this.variables[name] = value;
    }

    /**
     * Reset static variables
     */
    resetStaticVars() {
        this.staticVariables = {};
    }

    // ========== Preprocessor ==========

    processPreprocessor() {
        this.params = [];

        // Process all preprocessor tokens
        const newTokens = [];
        for (const token of this.tokens) {
            if (token.type === TokenType.PREPROCESSOR) {
                this.handlePreprocessor(token.value);
            } else {
                newTokens.push(token);
            }
        }
        this.tokens = newTokens;
    }

    handlePreprocessor(directive) {
        // #define_param <name> range <min> to <max> [default <val>]
        const paramMatch = directive.match(/#define_param\s+(\w+)\s+range\s+(?:from\s+)?(\S+)\s+to\s+(\S+)(?:\s+default\s+(\S+))?/i);
        if (paramMatch) {
            const [, name, minStr, maxStr, defaultStr] = paramMatch;
            const min = parseFloat(minStr);
            const max = parseFloat(maxStr);
            const defaultVal = defaultStr ? parseFloat(defaultStr) : min;

            this.params.push({
                name,
                min,
                max,
                default: defaultVal,
                isStatic: false
            });

            // Initialize variable with default value if not already set
            if (!(name in this.variables)) {
                this.variables[name] = defaultVal;
            }
            return;
        }

        // #define_var <name> <initial-value>
        const varMatch = directive.match(/#define_var\s+(\w+)\s+(\S+)/i);
        if (varMatch) {
            const [, name, valueStr] = varMatch;
            const value = parseFloat(valueStr);

            this.params.push({
                name,
                default: value,
                isStatic: true
            });

            // Initialize static variable if not already set
            if (!(name in this.staticVariables)) {
                this.staticVariables[name] = value;
                this.variables[name] = value;
            }
            return;
        }
    }

    // ========== Statement Parsing ==========

    statement() {
        const token = this.current();

        if (token.type === TokenType.KEYWORD && token.value === 'if') {
            this.ifStatement();
        } else if (token.type === TokenType.NAME) {
            this.assignment();
        } else if (token.type === TokenType.RBRACE || token.type === TokenType.EOF) {
            // Empty statement or end of block
            return;
        } else {
            throw new Error(`Unexpected token '${token.value}' at line ${token.line}`);
        }
    }

    ifStatement() {
        this.advance(); // consume 'if'
        this.expect(TokenType.LPAREN, '(');
        const condition = this.expression();
        this.expect(TokenType.RPAREN, ')');

        this.expect(TokenType.LBRACE, '{');

        if (condition > 0) {
            // Execute if block
            while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
                this.statement();
            }
            this.expect(TokenType.RBRACE, '}');

            // Skip else block if present
            if (this.check(TokenType.KEYWORD) && this.current().value === 'else') {
                this.advance(); // consume 'else'
                this.expect(TokenType.LBRACE, '{');
                this.skipBlock();
                this.expect(TokenType.RBRACE, '}');
            }
        } else {
            // Skip if block
            this.skipBlock();
            this.expect(TokenType.RBRACE, '}');

            // Execute else block if present
            if (this.check(TokenType.KEYWORD) && this.current().value === 'else') {
                this.advance(); // consume 'else'
                this.expect(TokenType.LBRACE, '{');
                while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
                    this.statement();
                }
                this.expect(TokenType.RBRACE, '}');
            }
        }
    }

    assignment() {
        const name = this.current().value;
        this.advance(); // consume name
        this.expect(TokenType.ASSIGN, '=');
        const value = this.expression();
        this.expect(TokenType.SEMICOLON, ';');

        // Check if trying to reassign a constant
        if (name.toLowerCase() in CONSTANTS) {
            throw new Error(`Cannot reassign constant '${name}' at line ${this.previous().line}`);
        }

        this.variables[name] = value;
    }

    skipBlock() {
        let depth = 1;
        while (depth > 0 && !this.isAtEnd()) {
            if (this.check(TokenType.LBRACE)) depth++;
            if (this.check(TokenType.RBRACE)) depth--;
            if (depth > 0) this.advance();
        }
    }

    // ========== Expression Parsing ==========

    expression() {
        return this.or();
    }

    or() {
        let left = this.and();
        while (this.matchOperator('||')) {
            const right = this.and();
            left = (left > 0 || right > 0) ? 1 : 0;
        }
        return left;
    }

    and() {
        let left = this.equality();
        while (this.matchOperator('&&')) {
            const right = this.equality();
            left = (left > 0 && right > 0) ? 1 : 0;
        }
        return left;
    }

    equality() {
        let left = this.comparison();
        while (this.matchOperator('==') || this.matchOperator('!=')) {
            const op = this.previous().value;
            const right = this.comparison();
            if (op === '==') left = (left === right) ? 1 : 0;
            else left = (left !== right) ? 1 : 0;
        }
        return left;
    }

    comparison() {
        let left = this.term();
        while (this.matchOperator('<') || this.matchOperator('>') ||
            this.matchOperator('<=') || this.matchOperator('>=')) {
            const op = this.previous().value;
            const right = this.term();
            switch (op) {
                case '<': left = (left < right) ? 1 : 0; break;
                case '>': left = (left > right) ? 1 : 0; break;
                case '<=': left = (left <= right) ? 1 : 0; break;
                case '>=': left = (left >= right) ? 1 : 0; break;
            }
        }
        return left;
    }

    term() {
        let left = this.factor();
        while (this.matchOperator('+') || this.matchOperator('-')) {
            const op = this.previous().value;
            const right = this.factor();
            if (op === '+') left += right;
            else left -= right;
        }
        return left;
    }

    factor() {
        let left = this.unary();
        while (this.matchOperator('*') || this.matchOperator('/') || this.matchOperator('%')) {
            const op = this.previous().value;
            const right = this.unary();
            if (op === '*') left *= right;
            else if (op === '/') {
                if (right === 0) throw new Error('Division by zero');
                left /= right;
            }
            else left %= right;
        }
        return left;
    }

    unary() {
        if (this.matchOperator('-')) {
            return -this.unary();
        }
        return this.primary();
    }

    primary() {
        const token = this.current();

        // Number
        if (token.type === TokenType.NUMBER) {
            this.advance();
            return token.value;
        }

        // Parenthesized expression
        if (token.type === TokenType.LPAREN) {
            this.advance();
            const value = this.expression();
            this.expect(TokenType.RPAREN, ')');
            return value;
        }

        // Name (variable or function call)
        if (token.type === TokenType.NAME) {
            this.advance();

            // Check if it's a function call
            if (this.check(TokenType.LPAREN)) {
                return this.functionCall(token.value);
            }

            // Variable lookup
            const name = token.value;
            if (name in this.variables) {
                return this.variables[name];
            }

            // Check constants (case insensitive)
            const lowerName = name.toLowerCase();
            if (lowerName in CONSTANTS) {
                return CONSTANTS[lowerName];
            }

            throw new Error(`Undefined variable '${name}' at line ${token.line}`);
        }

        throw new Error(`Unexpected token '${token.value}' at line ${token.line}`);
    }

    functionCall(name) {
        this.expect(TokenType.LPAREN, '(');

        const args = [];
        if (!this.check(TokenType.RPAREN)) {
            args.push(this.expression());
            while (this.check(TokenType.COMMA)) {
                this.advance(); // consume comma
                args.push(this.expression());
            }
        }

        this.expect(TokenType.RPAREN, ')');

        // Look up function (case insensitive)
        const lowerName = name.toLowerCase();
        if (lowerName in BUILTIN_FUNCTIONS) {
            return BUILTIN_FUNCTIONS[lowerName](args);
        }

        throw new Error(`Unknown function '${name}'`);
    }

    // ========== Utility Methods ==========

    current() {
        return this.tokens[this.pos];
    }

    previous() {
        return this.tokens[this.pos - 1];
    }

    advance() {
        if (!this.isAtEnd()) this.pos++;
        return this.previous();
    }

    check(type) {
        return !this.isAtEnd() && this.current().type === type;
    }

    isAtEnd() {
        return this.current().type === TokenType.EOF;
    }

    matchOperator(value) {
        if (this.check(TokenType.OPERATOR) && this.current().value === value) {
            this.advance();
            return true;
        }
        return false;
    }

    expect(type, expected) {
        if (this.check(type)) {
            return this.advance();
        }
        throw new Error(`Expected '${expected}' at line ${this.current().line}`);
    }
}
