import { describe, it, expect } from 'vitest';
import { findCycles, Graph } from '../src';

describe('Algos', () => {
  describe('findCycles', () => {
    it('should detect no cycles in empty graph', () => {
      const inGraph: Graph = {};
      const outGraph: Graph = {};

      const result = findCycles(inGraph, outGraph);

      expect(result.hasCycle).toBe(false);
      expect(result.cycles).toEqual({});
      expect(result.initialPath).toEqual([]);
    });

    it('should detect no cycles in simple linear graph', () => {
      const inGraph: Graph = {
        a: [],
        b: ['a'],
        c: ['b']
      };
      const outGraph: Graph = {
        a: ['b'],
        b: ['c'],
        c: []
      };

      // Make deep copies since findCycles modifies the graphs
      const inCopy = JSON.parse(JSON.stringify(inGraph));
      const outCopy = JSON.parse(JSON.stringify(outGraph));

      const result = findCycles(inCopy, outCopy);

      expect(result.hasCycle).toBe(false);
      expect(result.initialPath.length).toBeGreaterThan(0);
      expect(result.initialPath).toContain('a');
    });

    it('should detect simple cycle', () => {
      const inGraph: Graph = {
        a: ['b'],
        b: ['a']
      };
      const outGraph: Graph = {
        a: ['b'],
        b: ['a']
      };

      const result = findCycles(inGraph, outGraph);

      expect(result.hasCycle).toBe(true);
    });

    it('should detect self-referencing cycle', () => {
      const inGraph: Graph = {
        a: ['a']
      };
      const outGraph: Graph = {
        a: ['a']
      };

      const result = findCycles(inGraph, outGraph);

      expect(result.hasCycle).toBe(true);
      expect(result.cycles['a']).toContain('a');
    });

    it('should detect cycle in larger graph', () => {
      const inGraph: Graph = {
        a: [],
        b: ['a', 'e'],  // b has edges from a and e
        c: ['b'],
        d: ['c'],
        e: ['d']
      };
      const outGraph: Graph = {
        a: ['b'],
        b: ['c'],
        c: ['d'],
        d: ['e'],
        e: ['b']  // e points back to b, creating cycle: b->c->d->e->b
      };

      // Make deep copies since findCycles modifies the graphs
      const inCopy = JSON.parse(JSON.stringify(inGraph));
      const outCopy = JSON.parse(JSON.stringify(outGraph));

      const result = findCycles(inCopy, outCopy);

      expect(result.hasCycle).toBe(true);
    });

    it('should handle graph with multiple disconnected components', () => {
      const inGraph: Graph = {
        a: [],
        b: ['a'],
        c: [],
        d: ['c']
      };
      const outGraph: Graph = {
        a: ['b'],
        b: [],
        c: ['d'],
        d: []
      };

      // Make deep copies since findCycles modifies the graphs
      const inCopy = JSON.parse(JSON.stringify(inGraph));
      const outCopy = JSON.parse(JSON.stringify(outGraph));

      const result = findCycles(inCopy, outCopy);

      expect(result.hasCycle).toBe(false);
      expect(result.initialPath.length).toBeGreaterThan(0);
      expect(result.initialPath.length).toBeLessThanOrEqual(4);
    });

    it('should compute correct initialPath for dependencies', () => {
      // Simulates: a depends on nothing, b depends on a, c depends on b
      const inGraph: Graph = {
        a: [],
        b: ['a'],
        c: ['b']
      };
      const outGraph: Graph = {
        a: ['b'],
        b: ['c'],
        c: []
      };

      // Make deep copies since findCycles modifies the graphs
      const inCopy = JSON.parse(JSON.stringify(inGraph));
      const outCopy = JSON.parse(JSON.stringify(outGraph));

      const result = findCycles(inCopy, outCopy);

      expect(result.hasCycle).toBe(false);
      expect(result.initialPath.length).toBeGreaterThan(0);
      // Should have 'a' since it has no incoming edges initially
      expect(result.initialPath).toContain('a');
    });

    it('should handle complex dependency graph', () => {
      // Simulates: a depends on nothing, b depends on a, c depends on a, d depends on b and c
      const inGraph: Graph = {
        a: [],
        b: ['a'],
        c: ['a'],
        d: ['b', 'c']
      };
      const outGraph: Graph = {
        a: ['b', 'c'],
        b: ['d'],
        c: ['d'],
        d: []
      };

      // Make deep copies since findCycles modifies the graphs
      const inCopy = JSON.parse(JSON.stringify(inGraph));
      const outCopy = JSON.parse(JSON.stringify(outGraph));

      const result = findCycles(inCopy, outCopy);

      expect(result.hasCycle).toBe(false);
      expect(result.initialPath.length).toBeGreaterThan(0);
      expect(result.initialPath.length).toBeLessThanOrEqual(4);

      // Path should contain at least some nodes
      const hasNodes = result.initialPath.length > 0;
      expect(hasNodes).toBe(true);
    });

    it('should detect cycle while maintaining acyclic parts', () => {
      const inGraph: Graph = {
        a: ['c'],  // a has incoming from c
        b: ['a'],
        c: ['b'],
        d: [],
        e: ['d']
      };
      const outGraph: Graph = {
        a: ['b'],
        b: ['c'],
        c: ['a'],  // c points back to a, creating cycle a->b->c->a
        d: ['e'],
        e: []
      };

      // Make deep copies since findCycles modifies the graphs
      const inCopy = JSON.parse(JSON.stringify(inGraph));
      const outCopy = JSON.parse(JSON.stringify(outGraph));

      const result = findCycles(inCopy, outCopy);

      expect(result.hasCycle).toBe(true);
      // Should have some initial path (acyclic nodes get processed first)
      expect(result.initialPath.length).toBeGreaterThanOrEqual(0);
    });
  });
});
