import { describe, it, expect } from 'vitest';
import { Model, Formula, Rate, Conversion, Leak, State } from '../src';

describe('State Management', () => {
  describe('State initialization', () => {
    it('should initialize stocks with default values', () => {
      const m = new Model('Test');
      m.stock('a', new Formula(10));
      m.stock('b', new Formula(5));

      const state = new State(m);

      expect(state.state['a']).toBe(10);
      expect(state.state['b']).toBe(5);
    });

    it('should initialize stocks with formula references in correct order', () => {
      const m = new Model('Test');
      m.stock('base', new Formula(10));
      m.stock('derived', new Formula('base * 2'));

      const state = new State(m);

      expect(state.state['base']).toBe(10);
      expect(state.state['derived']).toBe(20);
    });

    it('should handle complex dependency chains', () => {
      const m = new Model('Test');
      m.stock('a', new Formula(5));
      m.stock('b', new Formula('a * 2'));
      m.stock('c', new Formula('b + a'));

      const state = new State(m);

      expect(state.state['a']).toBe(5);
      expect(state.state['b']).toBe(10);
      expect(state.state['c']).toBe(15); // b(10) + a(5)
    });

    it('should initialize infinite stocks', () => {
      const m = new Model('Test');
      m.infiniteStock('infinite');

      const state = new State(m);

      expect(state.state['infinite']).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe('State.advance()', () => {
    it('should process single flow correctly', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(10));
      const b = m.stock('b', new Formula(0));
      m.flow(a, b, new Rate(5));

      const state = new State(m);
      state.advance();

      expect(state.state['a']).toBe(5);
      expect(state.state['b']).toBe(5);
    });

    it('should process multiple flows correctly', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(20));
      const b = m.stock('b', new Formula(0));
      const c = m.stock('c', new Formula(0));

      m.flow(a, b, new Rate(5));
      m.flow(b, c, new Rate(3));

      const state = new State(m);
      state.advance();

      // First round: a->b flows 5, b->c flows 0 (b starts at 0)
      expect(state.state['a']).toBe(15);
      expect(state.state['b']).toBe(5);
      expect(state.state['c']).toBe(0);

      state.advance();

      // Second round: a->b flows 5, b->c flows 3
      expect(state.state['a']).toBe(10);
      expect(state.state['b']).toBe(7); // 5 + 5 - 3
      expect(state.state['c']).toBe(3);
    });

    it('should handle flows from infinite stocks', () => {
      const m = new Model('Test');
      const infinite = m.infiniteStock('infinite');
      const regular = m.stock('regular', new Formula(0));

      m.flow(infinite, regular, new Rate(10));

      const state = new State(m);
      state.advance();

      expect(state.state['infinite']).toBe(Number.POSITIVE_INFINITY);
      expect(state.state['regular']).toBe(10);
    });

    it('should respect stock maximums during advance', () => {
      const m = new Model('Test');
      const a = m.infiniteStock('a');
      const b = m.stock('b', new Formula(0), new Formula(5));

      m.flow(a, b, new Rate(10));

      const state = new State(m);
      state.advance();

      // Should be capped at maximum of 5
      expect(state.state['b']).toBe(5);
    });

    it('should not go below zero', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(3));
      const b = m.stock('b', new Formula(0));

      m.flow(a, b, new Rate(10));

      const state = new State(m);
      state.advance();

      // Should drain a completely but not go negative
      expect(state.state['a']).toBe(0);
      expect(state.state['b']).toBe(3);
    });
  });

  describe('State.snapshot()', () => {
    it('should create independent snapshot', () => {
      const m = new Model('Test');
      m.stock('a', new Formula(10));

      const state = new State(m);
      const snapshot1 = state.snapshot();

      state.state['a'] = 20;
      const snapshot2 = state.snapshot();

      expect(snapshot1['a']).toBe(10);
      expect(snapshot2['a']).toBe(20);
    });

    it('should capture all stocks', () => {
      const m = new Model('Test');
      m.stock('a', new Formula(5));
      m.stock('b', new Formula(10));
      m.stock('c', new Formula(15));

      const state = new State(m);
      const snapshot = state.snapshot();

      expect(Object.keys(snapshot).length).toBe(3);
      expect(snapshot['a']).toBe(5);
      expect(snapshot['b']).toBe(10);
      expect(snapshot['c']).toBe(15);
    });
  });

  describe('Complex state scenarios', () => {
    it('should handle conversion flows correctly', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(10));
      const b = m.stock('b', new Formula(0));

      m.flow(a, b, new Conversion(0.5));

      const state = new State(m);
      state.advance();

      expect(state.state['a']).toBe(0); // All consumed
      expect(state.state['b']).toBe(5); // 10 * 0.5
    });

    it('should handle leak flows correctly', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(100));
      const b = m.stock('b', new Formula(0));

      m.flow(a, b, new Leak(0.1));

      const state = new State(m);
      state.advance();

      expect(state.state['a']).toBe(90); // Lost 10%
      expect(state.state['b']).toBe(10); // Gained 10%
    });

    it('should handle multiple flows to same destination', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(10));
      const b = m.stock('b', new Formula(10));
      const c = m.stock('c', new Formula(0));

      m.flow(a, c, new Rate(5));
      m.flow(b, c, new Rate(3));

      const state = new State(m);
      state.advance();

      expect(state.state['a']).toBe(5);
      expect(state.state['b']).toBe(7);
      expect(state.state['c']).toBe(8); // 5 + 3
    });

    it('should handle multiple flows from same source', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(20));
      const b = m.stock('b', new Formula(0));
      const c = m.stock('c', new Formula(0));

      m.flow(a, b, new Rate(5));
      m.flow(a, c, new Rate(7));

      const state = new State(m);
      state.advance();

      expect(state.state['a']).toBe(8); // 20 - 5 - 7
      expect(state.state['b']).toBe(5);
      expect(state.state['c']).toBe(7);
    });

    it('should handle circular flow patterns', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(10));
      const b = m.stock('b', new Formula(10));

      m.flow(a, b, new Rate(3));
      m.flow(b, a, new Rate(2));

      const state = new State(m);
      state.advance();

      expect(state.state['a']).toBe(9); // 10 - 3 + 2
      expect(state.state['b']).toBe(11); // 10 + 3 - 2
    });

    it('should handle zero-valued flows', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(0));
      const b = m.stock('b', new Formula(0));

      m.flow(a, b, new Rate(5));

      const state = new State(m);
      state.advance();

      // Nothing should flow since source is zero
      expect(state.state['a']).toBe(0);
      expect(state.state['b']).toBe(0);
    });

    it('should handle flows with formula-based rates', () => {
      const m = new Model('Test');
      const multiplier = m.stock('multiplier', new Formula(3));
      const a = m.stock('a', new Formula(20));
      const b = m.stock('b', new Formula(0));

      m.flow(a, b, new Rate('multiplier * 2'));

      const state = new State(m);
      state.advance();

      // Flow rate should be 3 * 2 = 6
      expect(state.state['a']).toBe(14);
      expect(state.state['b']).toBe(6);
    });

    it('should handle capacity constraints with conversion', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(100));
      const b = m.stock('b', new Formula(0), new Formula(10));

      m.flow(a, b, new Conversion(0.5));

      const state = new State(m);
      state.advance();

      // Capacity is 10, so only 20 from source (10 / 0.5) should be consumed
      expect(state.state['b']).toBe(10);
      expect(state.state['a']).toBe(80); // 100 - 20
    });
  });
});
