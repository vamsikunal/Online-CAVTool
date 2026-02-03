/**
 * CAV Script Tokenizer
 * Lexical analyzer for the CAV scripting language
 */

// Token types
export const TokenType = {
    NUMBER: 'NUMBER',
    NAME: 'NAME',
    KEYWORD: 'KEYWORD',
    OPERATOR: 'OPERATOR',
    LPAREN: 'LPAREN',      // (
    RPAREN: 'RPAREN',      // )
    LBRACE: 'LBRACE',      // {
    RBRACE: 'RBRACE',      // }
    SEMICOLON: 'SEMICOLON', // ;
    COMMA: 'COMMA',        // ,
    ASSIGN: 'ASSIGN',      // =
    PREPROCESSOR: 'PREPROCESSOR',
    EOF: 'EOF'
};

// Keywords
const KEYWORDS = new Set(['if', 'else']);

// Operators (multi-char must come before single-char)
const OPERATORS = ['<=', '>=', '==', '!=', '&&', '||', '+', '-', '*', '/', '%', '<', '>'];

export class Token {
    constructor(type, value, line) {
        this.type = type;
        this.value = value;
        this.line = line;
    }
}

export class Tokenizer {
    constructor(source) {
        this.source = source;
        this.pos = 0;
        this.line = 1;
        this.tokens = [];
    }

    tokenize() {
        while (this.pos < this.source.length) {
            this.skipWhitespaceAndComments();
            if (this.pos >= this.source.length) break;

            const char = this.source[this.pos];

            // Preprocessor directive
            if (char === '#' && (this.pos === 0 || this.source[this.pos - 1] === '\n')) {
                this.readPreprocessor();
                continue;
            }

            // Comment (# not at start of line)
            if (char === '#') {
                this.skipLineComment();
                continue;
            }

            // Number
            if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek(1)))) {
                this.readNumber();
                continue;
            }

            // Name/Keyword
            if (this.isAlpha(char) || char === '_') {
                this.readName();
                continue;
            }

            // Operators
            if (this.tryReadOperator()) {
                continue;
            }

            // Single character tokens
            switch (char) {
                case '(':
                    this.tokens.push(new Token(TokenType.LPAREN, '(', this.line));
                    break;
                case ')':
                    this.tokens.push(new Token(TokenType.RPAREN, ')', this.line));
                    break;
                case '{':
                    this.tokens.push(new Token(TokenType.LBRACE, '{', this.line));
                    break;
                case '}':
                    this.tokens.push(new Token(TokenType.RBRACE, '}', this.line));
                    break;
                case ';':
                    this.tokens.push(new Token(TokenType.SEMICOLON, ';', this.line));
                    break;
                case ',':
                    this.tokens.push(new Token(TokenType.COMMA, ',', this.line));
                    break;
                case '=':
                    // Check if it's not == (already handled by operator check)
                    this.tokens.push(new Token(TokenType.ASSIGN, '=', this.line));
                    break;
                default:
                    throw new Error(`Unexpected character '${char}' at line ${this.line}`);
            }
            this.pos++;
        }

        this.tokens.push(new Token(TokenType.EOF, null, this.line));
        return this.tokens;
    }

    skipWhitespaceAndComments() {
        while (this.pos < this.source.length) {
            const char = this.source[this.pos];
            if (char === ' ' || char === '\t' || char === '\r') {
                this.pos++;
            } else if (char === '\n') {
                this.line++;
                this.pos++;
            } else {
                break;
            }
        }
    }

    skipLineComment() {
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
            this.pos++;
        }
    }

    peek(offset = 0) {
        const idx = this.pos + offset;
        return idx < this.source.length ? this.source[idx] : '\0';
    }

    isDigit(char) {
        return char >= '0' && char <= '9';
    }

    isAlpha(char) {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
    }

    isAlphaNumeric(char) {
        return this.isAlpha(char) || this.isDigit(char) || char === '_';
    }

    readNumber() {
        let start = this.pos;
        let hasDot = false;

        while (this.pos < this.source.length) {
            const char = this.source[this.pos];
            if (this.isDigit(char)) {
                this.pos++;
            } else if (char === '.' && !hasDot) {
                hasDot = true;
                this.pos++;
            } else {
                break;
            }
        }

        const value = parseFloat(this.source.substring(start, this.pos));
        this.tokens.push(new Token(TokenType.NUMBER, value, this.line));
    }

    readName() {
        let start = this.pos;
        while (this.pos < this.source.length && this.isAlphaNumeric(this.source[this.pos])) {
            this.pos++;
        }

        const name = this.source.substring(start, this.pos);
        const type = KEYWORDS.has(name.toLowerCase()) ? TokenType.KEYWORD : TokenType.NAME;
        this.tokens.push(new Token(type, name.toLowerCase() === 'if' || name.toLowerCase() === 'else' ? name.toLowerCase() : name, this.line));
    }

    readPreprocessor() {
        let start = this.pos;
        // Read until end of line
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
            this.pos++;
        }
        const directive = this.source.substring(start, this.pos).trim();
        this.tokens.push(new Token(TokenType.PREPROCESSOR, directive, this.line));
    }

    tryReadOperator() {
        for (const op of OPERATORS) {
            if (this.source.substring(this.pos, this.pos + op.length) === op) {
                this.tokens.push(new Token(TokenType.OPERATOR, op, this.line));
                this.pos += op.length;
                return true;
            }
        }
        return false;
    }
}
