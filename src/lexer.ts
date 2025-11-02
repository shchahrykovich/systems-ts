import { IllegalStockName, InvalidParameters } from './errors';

// Character constants
export const NEWLINE = '\n';
export const WHITESPACE = ' ';
export const START_INFINITE_STOCK = '[';
export const END_INFINITE_STOCK = ']';
export const START_PAREN = '(';
export const START_PARAMETER_SET = START_PAREN;
export const END_PAREN = ')';
export const END_PARAMETER_SET = END_PAREN;
export const FLOW_DIRECTION = '>';
export const FLOW_DELIMITER = '@';
export const COMMENT = '#';
export const INFINITY = 'inf';

// Token types
export const TOKEN_WHITESPACE = 'whitespace';
export const TOKEN_LINES = 'lines';
export const TOKEN_LINE = 'line';
export const TOKEN_NAME = 'name';
export const TOKEN_STOCK = 'stock';
export const TOKEN_STOCK_INFINITE = 'infinite_stock';
export const TOKEN_FLOW = 'flow';
export const TOKEN_FLOW_DIRECTION = 'flow_direction';
export const TOKEN_FLOW_DELIMITER = 'flow_delimiter';
export const TOKEN_PARAMS = 'params';
export const TOKEN_WHOLE = 'whole';
export const TOKEN_DECIMAL = 'decimal';
export const TOKEN_INFINITY = 'inf';
export const TOKEN_REFERENCE = 'reference';
export const TOKEN_FORMULA = 'formula';
export const TOKEN_OP = 'operation';
export const TOKEN_COMMENT = 'comment';

// Regex patterns
export const LEGAL_STOCK_NAME = /^[a-zA-Z][a-zA-Z0-9_]*/;
export const PARAM_WHOLE = /^-?[0-9]+$/;
export const PARAM_DECIMAL = /^[0-9]+\.[0-9]+$/;
export const OPERATIONS = /^[\/\+\-\*]$/;

// Token type definitions
export type TokenKind =
  | typeof TOKEN_WHITESPACE
  | typeof TOKEN_LINES
  | typeof TOKEN_LINE
  | typeof TOKEN_NAME
  | typeof TOKEN_STOCK
  | typeof TOKEN_STOCK_INFINITE
  | typeof TOKEN_FLOW
  | typeof TOKEN_FLOW_DIRECTION
  | typeof TOKEN_FLOW_DELIMITER
  | typeof TOKEN_PARAMS
  | typeof TOKEN_WHOLE
  | typeof TOKEN_DECIMAL
  | typeof TOKEN_INFINITY
  | typeof TOKEN_REFERENCE
  | typeof TOKEN_FORMULA
  | typeof TOKEN_OP
  | typeof TOKEN_COMMENT;

export type SimpleToken = [TokenKind, any];
export type FormulaToken = [typeof TOKEN_FORMULA, (SimpleToken | FormulaToken)[]];
export type ParamsToken = [typeof TOKEN_PARAMS, FormulaToken[]];
export type StockToken = [typeof TOKEN_STOCK | typeof TOKEN_STOCK_INFINITE, string, ParamsToken];
export type FlowToken = [typeof TOKEN_FLOW, string, ParamsToken];
export type Token = SimpleToken | StockToken | FlowToken | FormulaToken | ParamsToken;
export type LineToken = [typeof TOKEN_LINE, number, Token[]];
export type LinesToken = [typeof TOKEN_LINES, LineToken[]];

/**
 * Lex a single value. One of: WHOLE, DECIMAL, INFINITY, REFERENCE.
 */
export function lexValue(txt: string): SimpleToken {
  txt = txt.trim();
  if (txt === INFINITY) {
    return [TOKEN_INFINITY, txt];
  } else if (PARAM_WHOLE.test(txt)) {
    return [TOKEN_WHOLE, txt];
  } else if (PARAM_DECIMAL.test(txt)) {
    return [TOKEN_DECIMAL, txt];
  } else {
    return [TOKEN_REFERENCE, txt];
  }
}

/**
 * Lex a formula expression.
 */
export function lexFormula(txt: string): FormulaToken {
  const groups: (SimpleToken | FormulaToken)[][] = [];
  let tokens: (SimpleToken | FormulaToken)[] = [];
  let acc = '';

  for (const c of txt.trim() + NEWLINE) {
    if (c === START_PAREN) {
      groups.push(tokens);
      tokens = [];
    } else if (c === END_PAREN) {
      if (acc) {
        tokens.push(lexValue(acc));
      }
      acc = '';
      const prevTokens = groups.pop()!;
      prevTokens.push([TOKEN_FORMULA, tokens]);
      tokens = prevTokens;
    } else if (c === WHITESPACE || c === NEWLINE) {
      if (acc) {
        tokens.push(lexValue(acc));
      }
      acc = '';
    } else if (OPERATIONS.test(c)) {
      if (acc) {
        tokens.push(lexValue(acc));
        acc = '';
      }
      tokens.push([TOKEN_OP, c]);
    } else {
      acc += c;
    }
  }

  return [TOKEN_FORMULA, tokens];
}

/**
 * Lex parameters from a parameter set.
 */
export function lexParameters(txt: string): ParamsToken {
  if (txt === '') {
    return [TOKEN_PARAMS, []];
  } else if (txt.startsWith(START_PARAMETER_SET) && txt.endsWith(END_PARAMETER_SET)) {
    txt = txt.slice(1, -1);
    const params = txt.split(',');
    return [TOKEN_PARAMS, params.map((x) => lexFormula(x))];
  } else {
    throw new InvalidParameters(txt);
  }
}

/**
 * Lex a stock or flow caller with parameters.
 */
function lexCaller(token: TokenKind, txt: string): [TokenKind, string, ParamsToken] {
  txt = txt.trim();
  const match = txt.match(LEGAL_STOCK_NAME);

  if (!match) {
    throw new IllegalStockName(txt, LEGAL_STOCK_NAME.source);
  }

  const name = match[0];
  const rest = txt.slice(match[0].length);

  if (rest !== '' && !(rest.startsWith(START_PARAMETER_SET) && rest.endsWith(END_PARAMETER_SET))) {
    throw new IllegalStockName(txt, LEGAL_STOCK_NAME.source);
  }

  const params = lexParameters(rest);
  return [token, name, params];
}

/**
 * Lex a stock declaration.
 */
export function lexStock(txt: string): StockToken {
  txt = txt.trim();
  if (txt.startsWith(START_INFINITE_STOCK) && txt.endsWith(END_INFINITE_STOCK)) {
    return [TOKEN_STOCK_INFINITE, txt.slice(1, -1), [TOKEN_PARAMS, []]];
  } else {
    return lexCaller(TOKEN_STOCK, txt) as StockToken;
  }
}

/**
 * Lex a flow declaration.
 */
export function lexFlow(txt: string): FlowToken {
  txt = txt.trim();

  const match = txt.match(LEGAL_STOCK_NAME);
  if (match && txt.slice(match[0].length).startsWith(START_PARAMETER_SET) && txt.endsWith(END_PARAMETER_SET)) {
    return lexCaller(TOKEN_FLOW, txt) as FlowToken;
  } else {
    return [TOKEN_FLOW, '', lexParameters('(' + txt + ')')];
  }
}

/**
 * Lex the entire input text.
 */
export function lex(txt: string): LinesToken {
  // To eliminate edge cases, every txt starts with a whitespace and ends with a newline
  txt = ' ' + txt + '\n';

  const tokens: LineToken[] = [];
  let line: Token[] = [];
  let charBuff = txt[0];
  let parsing: TokenKind = TOKEN_STOCK;

  let lineNum = 0;
  for (let i = 1; i < txt.length; i++) {
    const c = txt[i];
    const prev = charBuff[charBuff.length - 1];

    if (c === COMMENT && line.length === 0 && charBuff === WHITESPACE) {
      parsing = TOKEN_COMMENT;
    } else if (parsing === TOKEN_COMMENT) {
      if (c === NEWLINE) {
        line.push([TOKEN_COMMENT, charBuff.slice(1)]);
        charBuff = WHITESPACE;
      }
    } else if (parsing === TOKEN_STOCK) {
      if (c === COMMENT) {
        // Inline comment detected - process accumulated buffer and switch to comment mode
        if (charBuff !== WHITESPACE) {
          line.push(lexStock(charBuff));
        }
        charBuff = WHITESPACE;
        parsing = TOKEN_COMMENT;
        continue;
      }
      if (c === FLOW_DIRECTION) {
        line.push(lexStock(charBuff));
        line.push([TOKEN_FLOW_DIRECTION, c]);
        charBuff = WHITESPACE;
        parsing = TOKEN_STOCK;
        continue;
      }
      if (c === FLOW_DELIMITER) {
        line.push(lexStock(charBuff));
        line.push([TOKEN_FLOW_DELIMITER, c]);
        charBuff = WHITESPACE;
        parsing = TOKEN_FLOW;
        continue;
      } else if (c === NEWLINE) {
        if (charBuff !== WHITESPACE) {
          line.push(lexStock(charBuff));
        }
        charBuff = WHITESPACE;
      }
    } else if (parsing === TOKEN_FLOW) {
      if (c === COMMENT) {
        // Inline comment detected - process accumulated buffer and switch to comment mode
        if (charBuff !== WHITESPACE) {
          line.push(lexFlow(charBuff));
        }
        charBuff = WHITESPACE;
        parsing = TOKEN_COMMENT;
        continue;
      }
      if (c === NEWLINE) {
        if (charBuff !== WHITESPACE) {
          line.push(lexFlow(charBuff));
        }
        charBuff = WHITESPACE;
      }
    }

    if (c === NEWLINE) {
      lineNum += 1;
      if (charBuff !== WHITESPACE) {
        throw new Error(`unused char_buff: ${charBuff}`);
      }
      if (line.length > 0) {
        tokens.push([TOKEN_LINE, lineNum, line]);
      }
      line = [];
      parsing = TOKEN_STOCK;
      charBuff = WHITESPACE;
    } else if ((c === WHITESPACE || c === FLOW_DIRECTION) && parsing !== TOKEN_COMMENT) {
      continue;
    } else {
      charBuff += c;
    }
  }

  return [TOKEN_LINES, tokens];
}

/**
 * Create human-readable format of lexed tokens.
 */
export function readable(token: any, classStr?: string): string {
  const kind = token[0];

  if (kind === TOKEN_WHITESPACE) {
    return WHITESPACE;
  } else if (kind === TOKEN_INFINITY) {
    return INFINITY;
  } else if (kind === TOKEN_LINES) {
    const lines = token[1];
    return lines.map((x: any) => readable(x)).join('\n');
  } else if (kind === TOKEN_FORMULA) {
    return token[1].map((x: any) => readable(x)).join(' ');
  } else if (kind === TOKEN_LINE) {
    const lineTokens = token[2];
    return lineTokens.map((x: any) => readable(x)).join(' ');
  } else if (
    [
      TOKEN_FLOW_DIRECTION,
      TOKEN_FLOW_DELIMITER,
      TOKEN_OP,
      TOKEN_COMMENT,
      TOKEN_DECIMAL,
      TOKEN_WHOLE,
      TOKEN_REFERENCE,
    ].includes(kind)
  ) {
    return token[1];
  } else if (kind === TOKEN_PARAMS) {
    const params = token[1];
    if (params.length === 0) {
      return '';
    }
    const joinedParams = params.map((x: any) => readable(x)).join(', ');
    if (!classStr) {
      return joinedParams;
    }
    return `(${joinedParams})`;
  } else if (kind === TOKEN_STOCK_INFINITE) {
    return START_INFINITE_STOCK + token[1] + END_INFINITE_STOCK;
  } else if (kind === TOKEN_STOCK || kind === TOKEN_FLOW) {
    const [, str, params] = token;
    return `${str}${readable(params, str)}`;
  } else {
    return `[unexpected token: '${token}']`;
  }
}
