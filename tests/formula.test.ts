import { describe, it, expect } from 'vitest';
import { Formula } from '../src';
import { InvalidFormula } from '../src';

describe('Formula Edge Cases', () => {
  describe('Formula validation', () => {
    it('should reject empty formula', () => {
      expect(() => {
        new Formula('');
      }).toThrow(InvalidFormula);
    });

    it('should reject formula starting with operator', () => {
      expect(() => {
        new Formula('+ 5');
      }).toThrow(InvalidFormula);
    });

    it('should reject formula ending with operator', () => {
      expect(() => {
        new Formula('5 +');
      }).toThrow(InvalidFormula);
    });

    it('should reject consecutive operators', () => {
      expect(() => {
        new Formula('5 + * 3');
      }).toThrow(InvalidFormula);
    });

    it('should reject missing operator between values', () => {
      expect(() => {
        new Formula('5 3');
      }).toThrow(InvalidFormula);
    });

    it('should reject missing operator between references', () => {
      expect(() => {
        new Formula('a b');
      }).toThrow(InvalidFormula);
    });
  });

  describe('Formula with parentheses', () => {
    it('should handle nested parentheses', () => {
      const f = new Formula('(a + b) * 2');
      expect(f.compute({ a: 3, b: 2 })).toBe(10);
    });

    it('should handle complex nested formula', () => {
      const f = new Formula('((a + b) * c) / d');
      expect(f.compute({ a: 2, b: 3, c: 4, d: 2 })).toBe(10);
    });

    it('should handle parentheses with single value', () => {
      const f = new Formula('(5) + 3');
      expect(f.compute()).toBe(8);
    });
  });

  describe('Formula with all operations', () => {
    it('should handle addition', () => {
      const f = new Formula('10 + 5');
      expect(f.compute()).toBe(15);
    });

    it('should handle subtraction', () => {
      const f = new Formula('10 - 5');
      expect(f.compute()).toBe(5);
    });

    it('should handle multiplication', () => {
      const f = new Formula('10 * 5');
      expect(f.compute()).toBe(50);
    });

    it('should handle division', () => {
      const f = new Formula('10 / 5');
      expect(f.compute()).toBe(2);
    });

    it('should handle mixed operations (left to right evaluation)', () => {
      const f = new Formula('10 + 5 * 2');
      // Note: evaluates left to right, so (10 + 5) * 2 = 30
      expect(f.compute()).toBe(30);
    });

    it('should handle chain of operations', () => {
      const f = new Formula('100 - 20 - 10');
      expect(f.compute()).toBe(70);
    });
  });

  describe('Formula with negative numbers', () => {
    it('should handle subtraction resulting in negative', () => {
      const f = new Formula('5 - 10');
      expect(f.compute()).toBe(-5);
    });

    it('should handle negative result from operations', () => {
      const f = new Formula('a - b');
      expect(f.compute({ a: 10, b: 20 })).toBe(-10);
    });

    it('should handle multiple subtractions with negative results', () => {
      const f = new Formula('0 - 5 - 3');
      expect(f.compute()).toBe(-8);
    });
  });

  describe('Formula with decimals', () => {
    it('should handle decimal numbers', () => {
      const f = new Formula('3.14');
      expect(f.compute()).toBe(3.14);
    });

    it('should handle decimal arithmetic', () => {
      const f = new Formula('2.5 * 4');
      expect(f.compute()).toBe(10);
    });

    it('should handle decimal division', () => {
      const f = new Formula('5 / 2');
      expect(f.compute()).toBe(2.5);
    });
  });

  describe('Formula with infinity', () => {
    it('should handle infinity literal', () => {
      const f = new Formula('inf');
      expect(f.compute()).toBe(Number.POSITIVE_INFINITY);
    });

    it('should handle infinity in arithmetic', () => {
      const f = new Formula('inf + 5');
      expect(f.compute()).toBe(Number.POSITIVE_INFINITY);
    });

    it('should handle infinity from constructor', () => {
      const f = new Formula(Number.POSITIVE_INFINITY);
      expect(f.compute()).toBe(Number.POSITIVE_INFINITY);
    });

    it('should handle division by infinity', () => {
      const f = new Formula('10 / inf');
      expect(f.compute()).toBe(0);
    });
  });

  describe('Formula references', () => {
    it('should extract single reference', () => {
      const f = new Formula('MyStock');
      const refs = f.references();
      expect(refs).toEqual(['MyStock']);
    });

    it('should extract multiple references', () => {
      const f = new Formula('a + b * c');
      const refs = f.references();
      expect(refs).toContain('a');
      expect(refs).toContain('b');
      expect(refs).toContain('c');
      expect(refs.length).toBe(3);
    });

    it('should extract references with underscores', () => {
      const f = new Formula('my_stock + other_stock');
      const refs = f.references();
      expect(refs).toContain('my_stock');
      expect(refs).toContain('other_stock');
    });

    it('should extract references with numbers', () => {
      const f = new Formula('stock1 + stock2');
      const refs = f.references();
      expect(refs).toContain('stock1');
      expect(refs).toContain('stock2');
    });

    it('should not extract numeric literals as references', () => {
      const f = new Formula('5 + 10');
      const refs = f.references();
      expect(refs.length).toBe(0);
    });
  });

  describe('Formula default values', () => {
    it('should return default when formula is empty or no tokens', () => {
      const f = new Formula(0, 42);
      expect(f.compute()).toBe(0);
    });

    it('should use computed value when state is provided', () => {
      const f = new Formula('existing', 42);
      expect(f.compute({ existing: 100 })).toBe(100);
    });
  });

  describe('Formula toString', () => {
    it('should format simple number', () => {
      const f = new Formula(5);
      const str = f.toString();
      expect(str).toContain('5');
    });

    it('should format expression', () => {
      const f = new Formula('a + b');
      const str = f.toString();
      expect(str).toContain('F(');
    });
  });

  describe('Formula edge cases in computation', () => {
    it('should handle missing reference in state', () => {
      const f = new Formula('missing');
      const result = f.compute({});
      expect(isNaN(result) || result === undefined).toBe(true);
    });

    it('should handle division by zero', () => {
      const f = new Formula('10 / 0');
      expect(f.compute()).toBe(Number.POSITIVE_INFINITY);
    });

    it('should handle multiplication overflow', () => {
      const f = new Formula('inf * inf');
      expect(f.compute()).toBe(Number.POSITIVE_INFINITY);
    });

    it('should handle very long formula', () => {
      const f = new Formula('1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1');
      expect(f.compute()).toBe(10);
    });
  });

  describe('Formula with complex references', () => {
    it('should handle case-sensitive references', () => {
      const f = new Formula('MyStock + mystock');
      expect(f.compute({ MyStock: 5, mystock: 3 })).toBe(8);
    });

    it('should handle references that look like keywords', () => {
      const f = new Formula('infinity + rate');
      expect(f.compute({ infinity: 10, rate: 5 })).toBe(15);
    });
  });
});
