import { describe, it, expect } from 'vitest';
import { Model, Formula, Rate, Conversion, Leak } from '../src';
import { IllegalSourceStock } from '../src';

describe('Models', () => {
  describe('Stock maximum with Rate', () => {
    it('should respect stock maximum values', () => {
      const m = new Model('Maximum');
      const a = m.infiniteStock('a');
      const bMax = 3;
      const b = m.stock('b', new Formula(0), new Formula(bMax));
      m.flow(a, b, new Rate(1));
      const results = m.run();

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (i > bMax) {
          expect(result['b']).toBe(bMax);
        }
      }
    });
  });

  describe('Illegal conversion/leak source', () => {
    it('should not allow Conversion on infinite stock', () => {
      const m = new Model('Maximum');
      const a = m.infiniteStock('a');
      const b = m.stock('b');

      expect(() => {
        m.flow(a, b, new Conversion(0.25));
      }).toThrow(IllegalSourceStock);
    });

    it('should not allow Leak on infinite stock', () => {
      const m = new Model('Maximum');
      const a = m.infiniteStock('a');
      const b = m.stock('b');

      expect(() => {
        m.flow(a, b, new Leak(0.25));
      }).toThrow(IllegalSourceStock);
    });
  });

  describe('Infinite destination stock', () => {
    it('should allow infinite stocks as destinations for Rate', () => {
      const m = new Model('Maximum');
      const a = m.stock('a', new Formula(100));
      const b = m.infiniteStock('b');
      m.flow(a, b, new Rate(5));
      m.run({ rounds: 3 } as any);
    });

    it('should allow infinite stocks as destinations for Conversion', () => {
      const m = new Model('Maximum');
      const a = m.stock('a', new Formula(100));
      const b = m.infiniteStock('b');
      m.flow(a, b, new Conversion(0.25));
      m.run(3);
    });

    it('should allow infinite stocks as destinations for Leak', () => {
      const m = new Model('Maximum');
      const a = m.stock('a', new Formula(100));
      const b = m.infiniteStock('b');
      m.flow(a, b, new Leak(0.25));
      m.run(3);
    });
  });

  describe('Stock maximum with Conversion', () => {
    it('should respect maximum when using conversion', () => {
      const m = new Model('Maximum');
      const aInitial = 10;
      const a = m.stock('a', new Formula(aInitial));
      const bMax = 3;
      const b = m.stock('b', new Formula(0), new Formula(bMax));
      const fRate = 0.5;

      m.flow(a, b, new Conversion(fRate));
      const results = m.run(3);
      const final = results[results.length - 1];

      expect(final['b']).toBe(bMax);

      // 10 - ((1 / 0.5) * 3) = 4
      const aExpected = aInitial - (1 / fRate) * bMax;
      expect(final['a']).toBe(aExpected);
    });
  });

  describe('Stock maximum with Leak', () => {
    it('should respect maximum when using leak', () => {
      const m = new Model('Maximum');
      const aInitial = 10;
      const a = m.stock('a', new Formula(aInitial));
      const bMax = 3;
      const b = m.stock('b', new Formula(0), new Formula(bMax));
      m.flow(a, b, new Leak(0.5));
      const results = m.run(2);
      const final = results[results.length - 1];

      expect(final['b']).toBe(bMax);
      expect(final['a']).toBe(aInitial - bMax);
    });
  });

  describe('Stock minimums', () => {
    it('should never dip below minimum (zero)', () => {
      const m = new Model('Minimum');
      const a = m.stock('a', new Formula(2));
      const b = m.stock('b', new Formula(0));
      m.flow(a, b, new Rate(1));
      const results = m.run(5);
      const final = results[results.length - 1];

      expect(final['a']).toBe(0);
      expect(final['b']).toBe(2);
    });
  });

  describe('Stock with formula-based flows', () => {
    it('should handle formula references in rates', () => {
      const m = new Model('Minimum');
      const c = m.stock('c', new Formula(2));
      const a = m.stock('a', new Formula(5));
      const b = m.stock('b', new Formula(0));
      m.flow(a, b, new Rate('c'));
      const results = m.run(5);
      const final = results[results.length - 1];

      expect(final['a']).toBe(0);
      expect(final['b']).toBe(5);
    });
  });

  describe('Formula', () => {
    it('should compute simple values', () => {
      const f = new Formula(5);
      expect(f.compute()).toBe(5);
    });

    it('should compute with references', () => {
      const f = new Formula('a + b');
      expect(f.compute({ a: 3, b: 4 })).toBe(7);
    });

    it('should compute with multiplication', () => {
      const f = new Formula('a * 2');
      expect(f.compute({ a: 5 })).toBe(10);
    });

    it('should compute with division', () => {
      const f = new Formula('a / 2');
      expect(f.compute({ a: 10 })).toBe(5);
    });

    it('should compute with subtraction', () => {
      const f = new Formula('a - 3');
      expect(f.compute({ a: 10 })).toBe(7);
    });

    it('should handle infinity', () => {
      const f = new Formula('inf');
      expect(f.compute()).toBe(Number.POSITIVE_INFINITY);
    });
  });
});
