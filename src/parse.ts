/**
 * Parser for systems language.
 */

import { Model, Formula, Stock, Rate, Conversion, Leak, DEFAULT_MAXIMUM } from './models';
import * as lexer from './lexer';
import {
  TOKEN_STOCK,
  TOKEN_STOCK_INFINITE,
  TOKEN_FLOW,
  TOKEN_DECIMAL,
  StockToken,
  FlowToken,
} from './lexer';
import { ParseError, UnknownFlowType, ConflictingValues, DeferLineInfo } from './errors';

/**
 * Build stock from the lexed components.
 */
export function buildStock(model: Model, tokenTuple: StockToken): Stock {
  const [token, name, paramsToken] = tokenTuple;
  const [, params] = paramsToken;

  if (token === TOKEN_STOCK_INFINITE) {
    return model.infiniteStock(name);
  }

  const defaultInitial = new Formula(0);
  let initial = defaultInitial;
  const defaultMaximum = new Formula(DEFAULT_MAXIMUM);
  let maximum = defaultMaximum;

  if (params.length > 0) {
    initial = new Formula(params[0]);
  }
  if (params.length > 1) {
    maximum = new Formula(params[1]);
  }

  const exists = model.getStock(name);
  if (exists) {
    if (JSON.stringify(initial.lexed) !== JSON.stringify(defaultInitial.lexed)) {
      if (
        JSON.stringify(exists.initial.lexed) !== JSON.stringify(initial.lexed) &&
        JSON.stringify(exists.initial.lexed) === JSON.stringify(defaultInitial.lexed)
      ) {
        exists.initial = initial;
      } else {
        throw new ConflictingValues(name, exists.initial, initial);
      }
    }
    if (JSON.stringify(maximum.lexed) !== JSON.stringify(defaultMaximum.lexed)) {
      if (
        JSON.stringify(exists.maximum.lexed) !== JSON.stringify(maximum.lexed) &&
        JSON.stringify(exists.maximum.lexed) === JSON.stringify(defaultMaximum.lexed)
      ) {
        exists.maximum = maximum;
      } else {
        throw new ConflictingValues(name, exists.maximum, maximum);
      }
    }
    return exists;
  }

  return model.stock(name, initial, maximum);
}

/**
 * Parse stock from raw text. Used primarily for testing or iterative parsing.
 */
export function parseStock(model: Model, txt: string): Stock {
  return buildStock(model, lexer.lexStock(txt));
}

/**
 * Build flow from lexed components.
 */
export function buildFlow(model: Model, src: Stock, dest: Stock, token: FlowToken): void {
  const [, classStr, paramsToken] = token;
  const [, params] = paramsToken;

  let rateClass: typeof Rate | typeof Conversion | typeof Leak;
  const lowerClassStr = classStr.toLowerCase();

  if (lowerClassStr === 'leak') {
    rateClass = Leak;
  } else if (lowerClassStr === 'conversion') {
    rateClass = Conversion;
  } else if (lowerClassStr === 'rate') {
    rateClass = Rate;
  } else if (classStr === '') {
    // Auto-detect: if it's a decimal, use Conversion, otherwise Rate
    if (params.length > 0 && params[0][1].length === 1 && params[0][1][0][0] === TOKEN_DECIMAL) {
      rateClass = Conversion;
    } else {
      rateClass = Rate;
    }
  } else {
    throw new UnknownFlowType(classStr);
  }

  const rate = new rateClass(params[0]);
  model.flow(src, dest, rate);
}

/**
 * Parse flow from raw text. Used primarily for testing or iterative parsing.
 */
export function parseFlow(model: Model, src: Stock, dest: Stock, txt: string): void {
  return buildFlow(model, src, dest, lexer.lexFlow(txt));
}

/**
 * Parse a complete system specification.
 */
export function parse(txt: string, tracebacks: boolean = true): Model {
  const m = new Model('Parsed');

  const [, tokens] = lexer.lex(txt);
  for (const token of tokens) {
    const [, n, line] = token;
    let firstStock: Stock | null = null;
    let secondStock: Stock | null = null;

    try {
      for (const lineToken of line) {
        if (lineToken[0] === TOKEN_STOCK || lineToken[0] === TOKEN_STOCK_INFINITE) {
          if (firstStock === null) {
            firstStock = buildStock(m, lineToken as unknown as StockToken);
          } else if (secondStock === null) {
            secondStock = buildStock(m, lineToken as unknown as StockToken);
          }
        } else if (lineToken[0] === TOKEN_FLOW) {
          if (firstStock && secondStock) {
            buildFlow(m, firstStock, secondStock, lineToken as unknown as FlowToken);
          }
        }
      }
    } catch (e) {
      if (e instanceof DeferLineInfo) {
        if (tracebacks) {
          console.error(e);
        }
        e.line = line;
        e.lineNumber = n;
        throw e;
      } else if (e instanceof Error) {
        if (tracebacks) {
          console.error(e);
        }
        throw new ParseError(line, n, e);
      } else {
        throw e;
      }
    }
  }

  return m;
}
