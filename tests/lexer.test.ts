import { describe, it, expect } from 'vitest';
import {
  lexValue,
  lexFormula,
  lexStock,
  lexFlow,
  lex,
  readable,
  TOKEN_WHOLE,
  TOKEN_DECIMAL,
  TOKEN_INFINITY,
  TOKEN_REFERENCE,
  TOKEN_STOCK,
  TOKEN_STOCK_INFINITE,
  TOKEN_FLOW,
  TOKEN_FORMULA,
} from '../src';

describe('Lexer', () => {
  describe('lexValue', () => {
    it('should lex whole numbers', () => {
      const [kind, val] = lexValue('42');
      expect(kind).toBe(TOKEN_WHOLE);
      expect(val).toBe('42');
    });

    it('should lex negative numbers', () => {
      const [kind, val] = lexValue('-5');
      expect(kind).toBe(TOKEN_WHOLE);
      expect(val).toBe('-5');
    });

    it('should lex decimal numbers', () => {
      const [kind, val] = lexValue('3.14');
      expect(kind).toBe(TOKEN_DECIMAL);
      expect(val).toBe('3.14');
    });

    it('should lex infinity', () => {
      const [kind, val] = lexValue('inf');
      expect(kind).toBe(TOKEN_INFINITY);
      expect(val).toBe('inf');
    });

    it('should lex references', () => {
      const [kind, val] = lexValue('MyStock');
      expect(kind).toBe(TOKEN_REFERENCE);
      expect(val).toBe('MyStock');
    });
  });

  describe('lexFormula', () => {
    it('should lex simple number', () => {
      const [kind, tokens] = lexFormula('5');
      expect(kind).toBe(TOKEN_FORMULA);
      expect(tokens.length).toBe(1);
      expect(tokens[0][0]).toBe(TOKEN_WHOLE);
    });

    it('should lex addition', () => {
      const [kind, tokens] = lexFormula('a + b');
      expect(kind).toBe(TOKEN_FORMULA);
      expect(tokens.length).toBe(3);
      expect(tokens[0][0]).toBe(TOKEN_REFERENCE);
      expect(tokens[1][0]).toBe('operation');
      expect(tokens[2][0]).toBe(TOKEN_REFERENCE);
    });

    it('should lex multiplication', () => {
      const [kind, tokens] = lexFormula('Managers * 4');
      expect(kind).toBe(TOKEN_FORMULA);
      expect(tokens.length).toBe(3);
      expect(tokens[1][1]).toBe('*');
    });

    it('should lex complex formula', () => {
      const [kind, tokens] = lexFormula('a * 2 + b / 3');
      expect(kind).toBe(TOKEN_FORMULA);
      expect(tokens.length).toBe(7);
    });
  });

  describe('lexStock', () => {
    it('should lex simple stock', () => {
      const [kind, name, params] = lexStock('MyStock');
      expect(kind).toBe(TOKEN_STOCK);
      expect(name).toBe('MyStock');
      expect(params[1].length).toBe(0);
    });

    it('should lex stock with initial value', () => {
      const [kind, name, params] = lexStock('MyStock(10)');
      expect(kind).toBe(TOKEN_STOCK);
      expect(name).toBe('MyStock');
      expect(params[1].length).toBe(1);
    });

    it('should lex stock with initial and max', () => {
      const [kind, name, params] = lexStock('MyStock(5, 20)');
      expect(kind).toBe(TOKEN_STOCK);
      expect(name).toBe('MyStock');
      expect(params[1].length).toBe(2);
    });

    it('should lex infinite stock', () => {
      const [kind, name, params] = lexStock('[InfiniteStock]');
      expect(kind).toBe(TOKEN_STOCK_INFINITE);
      expect(name).toBe('InfiniteStock');
    });
  });

  describe('lexFlow', () => {
    it('should lex simple rate', () => {
      const [kind, className, params] = lexFlow('5');
      expect(kind).toBe(TOKEN_FLOW);
      expect(className).toBe('');
      expect(params[1].length).toBe(1);
    });

    it('should lex named rate', () => {
      const [kind, className, params] = lexFlow('Rate(5)');
      expect(kind).toBe(TOKEN_FLOW);
      expect(className).toBe('Rate');
      expect(params[1].length).toBe(1);
    });

    it('should lex Conversion', () => {
      const [kind, className, params] = lexFlow('Conversion(0.5)');
      expect(kind).toBe(TOKEN_FLOW);
      expect(className).toBe('Conversion');
    });

    it('should lex Leak', () => {
      const [kind, className, params] = lexFlow('Leak(0.1)');
      expect(kind).toBe(TOKEN_FLOW);
      expect(className).toBe('Leak');
    });
  });

  describe('lex', () => {
    it('should lex single line', () => {
      const [kind, lines] = lex('a > b @ 5');
      expect(kind).toBe('lines');
      expect(lines.length).toBe(1);
    });

    it('should lex multiple lines', () => {
      const [kind, lines] = lex('a > b @ 5\nc > d @ 3');
      expect(kind).toBe('lines');
      expect(lines.length).toBe(2);
    });

    it('should lex with comments', () => {
      const [kind, lines] = lex('# Comment\na > b @ 5');
      expect(kind).toBe('lines');
      expect(lines.length).toBe(2);
    });

    it('should skip empty lines', () => {
      const [kind, lines] = lex('a > b @ 5\n\nc > d @ 3');
      expect(kind).toBe('lines');
      expect(lines.length).toBe(2);
    });
  });

  describe('readable', () => {
    it('should format simple stock', () => {
      const stock = lexStock('MyStock(10)');
      const formatted = readable(stock);
      expect(formatted).toBe('MyStock(10)');
    });

    it('should format infinite stock', () => {
      const stock = lexStock('[InfiniteStock]');
      const formatted = readable(stock);
      expect(formatted).toBe('[InfiniteStock]');
    });

    it('should format flow', () => {
      const flow = lexFlow('Rate(5)');
      const formatted = readable(flow);
      expect(formatted).toBe('Rate(5)');
    });

    it('should format complete line', () => {
      const [, lines] = lex('a > b @ 5');
      const [, lineNum, tokens] = lines[0];
      const formatted = readable([TOKEN_FORMULA, tokens]);
      expect(formatted).toContain('a');
      expect(formatted).toContain('b');
    });
  });
});
