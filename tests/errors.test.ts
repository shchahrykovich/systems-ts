import { describe, it, expect } from 'vitest';
import {
  SystemsException,
  ParseException,
  IllegalSystemException,
  IllegalStockName,
  IllegalSourceStock,
  FormulaError,
  CircularReferences,
  InvalidFormula,
  ParseError,
  DeferLineInfo,
  InvalidParameters,
  ConflictingValues,
  UnknownFlowType
} from '../src';
import { Formula, Stock, Conversion } from '../src';

describe('Errors', () => {
  describe('SystemsException', () => {
    it('should create error with message', () => {
      const error = new SystemsException('test message');
      expect(error.message).toBe('test message');
      expect(error.name).toBe('SystemsException');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ParseException', () => {
    it('should extend SystemsException', () => {
      const error = new ParseException('parse error');
      expect(error.message).toBe('parse error');
      expect(error.name).toBe('ParseException');
      expect(error).toBeInstanceOf(SystemsException);
    });
  });

  describe('IllegalSystemException', () => {
    it('should extend SystemsException', () => {
      const error = new IllegalSystemException('illegal system');
      expect(error.message).toBe('illegal system');
      expect(error.name).toBe('IllegalSystemException');
      expect(error).toBeInstanceOf(SystemsException);
    });
  });

  describe('IllegalStockName', () => {
    it('should format error message with stock name and pattern', () => {
      const error = new IllegalStockName('123Invalid', '^[a-zA-Z][a-zA-Z0-9_]*');
      expect(error.message).toContain('123Invalid');
      expect(error.message).toContain('not a legal stock name');
      expect(error.stockName).toBe('123Invalid');
      expect(error.allowed).toBe('^[a-zA-Z][a-zA-Z0-9_]*');
    });
  });

  describe('IllegalSourceStock', () => {
    it('should format error with rate and source info', () => {
      const stock = new Stock('InfiniteStock', new Formula(Number.POSITIVE_INFINITY));
      const rate = new Conversion(0.5);
      const error = new IllegalSourceStock(rate, stock);

      expect(error.message).toContain('InfiniteStock');
      expect(error.message).toContain('cannot be used as source');
      expect(error.rate).toBe(rate);
      expect(error.source).toBe(stock);
    });
  });

  describe('FormulaError', () => {
    it('should include formula in error message', () => {
      const formula = new Formula(5);
      const error = new FormulaError(formula);

      expect(error.message).toContain('FormulaError');
      expect(error.formula).toBe(formula);
    });
  });

  describe('CircularReferences', () => {
    it('should format error with cycle and graph info', () => {
      const cycle = { a: ['b'], b: ['a'] };
      const graph = { a: ['b'], b: ['a'] };
      const error = new CircularReferences(cycle, graph);

      expect(error.message).toContain('found cycle');
      expect(error.cycle).toBe(cycle);
      expect(error.graph).toBe(graph);
    });
  });

  describe('InvalidFormula', () => {
    it('should include formula and reason in error message', () => {
      const formula = new Formula(5);
      const error = new InvalidFormula(formula, 'division by zero');

      expect(error.message).toContain('illegal formula');
      expect(error.message).toContain('division by zero');
      expect(error.formula).toBe(formula);
      expect(error.msg).toBe('division by zero');
    });
  });

  describe('ParseError', () => {
    it('should format error with line number and content', () => {
      const error = new ParseError('a > b @ invalid', 5);

      expect(error.message).toContain('line 5');
      expect(error.message).toContain('could not be parsed');
      expect(error.line).toBe('a > b @ invalid');
      expect(error.lineNumber).toBe(5);
    });

    it('should include nested exception if provided', () => {
      const innerError = new Error('Invalid syntax');
      const error = new ParseError('a > b', 3, innerError);

      expect(error.message).toContain('line 3');
      expect(error.message).toContain('Invalid syntax');
      expect(error.exception).toBe(innerError);
    });

    it('should work without line info', () => {
      const error = new ParseError();
      expect(error.message).toContain('line 0');
      expect(error.lineNumber).toBe(0);
    });
  });

  describe('DeferLineInfo', () => {
    it('should extend ParseError', () => {
      const error = new DeferLineInfo('test line', 10);
      expect(error).toBeInstanceOf(ParseError);
      expect(error.name).toBe('DeferLineInfo');
      expect(error.line).toBe('test line');
      expect(error.lineNumber).toBe(10);
    });
  });

  describe('InvalidParameters', () => {
    it('should format error with invalid parameters text', () => {
      const error = new InvalidParameters('(invalid', 'a > b @ (invalid', 7);

      const message = error.toString();
      expect(message).toContain('line 7');
      expect(message).toContain('invalid parameters');
      expect(message).toContain('(invalid');
      expect(error.txt).toBe('(invalid');
    });

    it('should work without line info', () => {
      const error = new InvalidParameters('bad params');
      expect(error.txt).toBe('bad params');
    });
  });

  describe('ConflictingValues', () => {
    it('should format error with stock name and conflicting values', () => {
      const first = new Formula(5);
      const second = new Formula(10);
      const error = new ConflictingValues('MyStock', first, second, 'MyStock(10)', 3);

      const message = error.toString();
      expect(message).toContain('line 3');
      expect(message).toContain('MyStock');
      expect(message).toContain('conflicting value');
      expect(error.stockName).toBe('MyStock');
      expect(error.first).toBe(first);
      expect(error.second).toBe(second);
    });

    it('should format differently without line info', () => {
      const first = new Formula(5);
      const second = new Formula(10);
      const error = new ConflictingValues('MyStock', first, second);

      const message = error.toString();
      expect(message).not.toContain('line');
      expect(message).toContain('MyStock');
      expect(message).toContain('conflicting value');
    });
  });

  describe('UnknownFlowType', () => {
    it('should format error with flow type', () => {
      const error = new UnknownFlowType('InvalidFlow', 'a > b @ InvalidFlow(5)', 8);

      const message = error.toString();
      expect(message).toContain('line 8');
      expect(message).toContain('invalid flow type');
      expect(message).toContain('InvalidFlow');
      expect(error.flowType).toBe('InvalidFlow');
    });
  });
});
