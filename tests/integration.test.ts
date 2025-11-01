import { describe, it, expect } from 'vitest';
import { parse } from '../src';
import { Model, Formula, Rate, Conversion } from '../src';
import { ConflictingValues, UnknownFlowType } from '../src';

describe('Integration Tests', () => {
  describe('Complex hiring funnel simulation', () => {
    it('should simulate complete hiring pipeline over multiple rounds', () => {
      const spec = `
[Candidates] > PhoneScreens @ 25
PhoneScreens > Onsites @ Conversion(0.5)
Onsites > Offers @ Conversion(0.5)
Offers > Hires @ Conversion(0.8)
Hires > Employees(5) @ Rate(1)
Employees > Departures @ Leak(0.05)
Departures > [Departed] @ Rate(1)
      `;

      const model = parse(spec);
      const results = model.run(10);

      // Verify initial state
      expect(results[0]['Employees']).toBe(5);
      expect(results[0]['PhoneScreens']).toBe(0);

      // Verify progression
      expect(results[1]['PhoneScreens']).toBe(25);

      // Check final state has reasonable values
      const final = results[results.length - 1];
      expect(final['Employees']).toBeGreaterThan(5);
      expect(final['Departures']).toBeGreaterThanOrEqual(0);
    });

    it('should render hiring funnel output correctly', () => {
      const spec = `
[Candidates] > PhoneScreens @ 25
PhoneScreens > Onsites @ 0.5
      `;

      const model = parse(spec);
      const results = model.run(3);
      const output = model.render(results);

      expect(output).toContain('PhoneScreens');
      expect(output).toContain('Onsites');
      expect(output).not.toContain('Candidates');

      const lines = output.split('\n');
      expect(lines.length).toBe(5); // header + 4 rounds
    });
  });

  describe('Resource allocation with constraints', () => {
    it('should handle capacity-constrained resource flow', () => {
      const m = new Model('Resources');
      const budget = m.stock('Budget', new Formula(1000));
      const engineers = m.stock('Engineers', new Formula(10), new Formula(20));
      const projects = m.stock('Projects', new Formula(0), new Formula(5));

      m.flow(budget, engineers, new Rate(100));
      m.flow(engineers, projects, new Conversion(0.5));

      const results = m.run(5);
      const final = results[results.length - 1];

      // Engineers should be capped at 20
      expect(final['Engineers']).toBeLessThanOrEqual(20);

      // Projects should be capped at 5
      expect(final['Projects']).toBeLessThanOrEqual(5);
    });

    it('should handle multi-stage resource transformation', () => {
      const spec = `
[RawMaterials] > Processing @ 50
Processing > Refined @ Conversion(0.8)
Refined > Products @ Conversion(0.9)
Products > [Sold] @ Rate(10)
      `;

      const model = parse(spec);
      const results = model.run(5);

      // Verify material flows through pipeline
      expect(results[1]['Processing']).toBe(50);
      expect(results[2]['Refined']).toBeGreaterThan(0);
      expect(results[3]['Products']).toBeGreaterThan(0);
    });
  });

  describe('Complex formula dependencies', () => {
    it('should handle multi-level formula dependencies', () => {
      const spec = `
BaseRate(5)
Multiplier(BaseRate * 2)
Capacity(Multiplier * 3, Multiplier * 6)
[Source] > Destination(0, Capacity) @ Multiplier
      `;

      const model = parse(spec);
      const results = model.run(2);

      // BaseRate = 5, Multiplier = 10, Capacity max = 60
      expect(results[0]['BaseRate']).toBe(5);
      expect(results[0]['Multiplier']).toBe(10);
      expect(results[0]['Capacity']).toBe(30);

      // Flow rate should be Multiplier = 10
      expect(results[1]['Destination']).toBe(10);
    });

    it('should reject circular dependencies in formulas', () => {
      const spec = `
a(b)
b(a)
      `;

      expect(() => {
        const model = parse(spec);
        model.run(1); // Validation happens during run
      }).toThrow(); // Will throw CircularReferences or ParseError wrapping it
    });

    it('should reject self-referencing formulas', () => {
      const spec = `
a(a * 2)
      `;

      expect(() => {
        const model = parse(spec);
        model.run(1); // Validation happens during run
      }).toThrow(); // Will throw CircularReferences or ParseError wrapping it
    });

    it('should reject references to non-existent stocks', () => {
      const spec = `
a(nonexistent * 2)
      `;

      expect(() => {
        const model = parse(spec);
        model.run(1); // Validation happens during run
      }).toThrow(); // Will throw InvalidFormula or ParseError wrapping it
    });
  });

  describe('Complex flow patterns', () => {
    it('should handle fan-out pattern (one source, multiple destinations)', () => {
      const m = new Model('FanOut');
      const source = m.stock('source', new Formula(100));
      const dest1 = m.stock('dest1', new Formula(0));
      const dest2 = m.stock('dest2', new Formula(0));
      const dest3 = m.stock('dest3', new Formula(0));

      m.flow(source, dest1, new Rate(10));
      m.flow(source, dest2, new Rate(15));
      m.flow(source, dest3, new Rate(20));

      const results = m.run(1);
      const final = results[1];

      expect(final['source']).toBe(55); // 100 - 10 - 15 - 20
      expect(final['dest1']).toBe(10);
      expect(final['dest2']).toBe(15);
      expect(final['dest3']).toBe(20);
    });

    it('should handle fan-in pattern (multiple sources, one destination)', () => {
      const m = new Model('FanIn');
      const source1 = m.stock('source1', new Formula(50));
      const source2 = m.stock('source2', new Formula(30));
      const source3 = m.stock('source3', new Formula(20));
      const dest = m.stock('dest', new Formula(0));

      m.flow(source1, dest, new Rate(5));
      m.flow(source2, dest, new Rate(7));
      m.flow(source3, dest, new Rate(3));

      const results = m.run(1);
      const final = results[1];

      expect(final['dest']).toBe(15); // 5 + 7 + 3
      expect(final['source1']).toBe(45);
      expect(final['source2']).toBe(23);
      expect(final['source3']).toBe(17);
    });

    it('should handle pipeline pattern', () => {
      const spec = `
[Start] > Stage1 @ 20
Stage1 > Stage2 @ 0.8
Stage2 > Stage3 @ 0.9
Stage3 > [End] @ Rate(5)
      `;

      const model = parse(spec);
      const results = model.run(10);

      // Verify material flows through each stage
      const final = results[results.length - 1];
      expect(final['Stage1']).toBeGreaterThan(0);
      expect(final['Stage2']).toBeGreaterThan(0);
      expect(final['Stage3']).toBeGreaterThan(0);
    });

    it('should handle circular flow with equilibrium', () => {
      const m = new Model('Circular');
      const a = m.stock('a', new Formula(50));
      const b = m.stock('b', new Formula(50));

      m.flow(a, b, new Rate(10));
      m.flow(b, a, new Rate(10));

      const results = m.run(5);
      const final = results[results.length - 1];

      // Should remain balanced
      expect(final['a']).toBe(50);
      expect(final['b']).toBe(50);
    });
  });

  describe('Validation errors', () => {
    it('should reject infinite source with Conversion', () => {
      const spec = `
[Infinite] > Regular @ Conversion(0.5)
      `;

      expect(() => {
        parse(spec);
      }).toThrow(); // Will throw IllegalSourceStock or ParseError wrapping it
    });

    it('should reject infinite source with Leak', () => {
      const spec = `
[Infinite] > Regular @ Leak(0.1)
      `;

      expect(() => {
        parse(spec);
      }).toThrow(); // Will throw IllegalSourceStock or ParseError wrapping it
    });

    it('should reject conflicting initial values', () => {
      const spec = `
a(10) > b @ 5
a(20) > c @ 3
      `;

      expect(() => {
        parse(spec);
      }).toThrow(ConflictingValues);
    });

    it('should reject conflicting maximum values', () => {
      const spec = `
a(0, 10) > b @ 5
a(0, 20) > c @ 3
      `;

      expect(() => {
        parse(spec);
      }).toThrow(ConflictingValues);
    });

    it('should reject unknown flow type', () => {
      const spec = `
a > b @ InvalidType(5)
      `;

      expect(() => {
        parse(spec);
      }).toThrow(UnknownFlowType);
    });
  });

  describe('Edge cases in parsing', () => {
    it('should handle comments interspersed with code', () => {
      const spec = `
# Initial setup
a(10) > b @ 5
# Flow from b to c
b > c @ 3
# Final destination
c > [done] @ 1
      `;

      const model = parse(spec);
      expect(model.stocks.length).toBe(4); // a, b, c, done
      expect(model.flows.length).toBe(3);
    });

    it('should handle empty lines', () => {
      const spec = `
a(10) > b @ 5

b > c @ 3


c > d @ 1
      `;

      const model = parse(spec);
      expect(model.stocks.length).toBe(4);
      expect(model.flows.length).toBe(3);
    });

    it('should handle whitespace variations', () => {
      const spec = `
a(10)>b@5
b   >   c   @   3
c     >     d     @     1
      `;

      const model = parse(spec);
      expect(model.stocks.length).toBe(4);
      expect(model.flows.length).toBe(3);
    });

    it('should allow stock reuse with parameter updates', () => {
      const spec = `
a > b @ 5
b(10) > c @ 3
b > d @ 2
      `;

      const model = parse(spec);
      const b = model.getStock('b');

      expect(b).toBeDefined();
      expect(b!.initial.compute()).toBe(10);
      expect(model.flows.length).toBe(3);
    });
  });

  describe('Real-world scenarios', () => {
    it('should model project capacity planning', () => {
      const spec = `
Developers(10)
[Features] > Backlog @ 20
Backlog > InProgress(0, Developers * 2) @ Developers
InProgress > Testing @ Conversion(0.8)
Testing > [Deployed] @ Rate(5)
      `;

      const model = parse(spec);
      const results = model.run(10);

      const final = results[results.length - 1];

      // InProgress should respect capacity constraint
      expect(final['InProgress']).toBeLessThanOrEqual(20); // Developers * 2
      expect(final['Testing']).toBeGreaterThan(0);
    });

    it('should model inventory management with leakage', () => {
      const spec = `
[Supply] > Warehouse(0, 500) @ 100
Warehouse > Spoilage @ Leak(0.02)
Warehouse > Sales @ Rate(30)
Spoilage > [Waste] @ Rate(1)
Sales > [Revenue] @ Rate(1)
      `;

      const model = parse(spec);
      const results = model.run(10);

      const final = results[results.length - 1];

      // Warehouse should have accumulating inventory with some spoilage
      expect(final['Warehouse']).toBeGreaterThan(0);
      expect(final['Warehouse']).toBeLessThanOrEqual(500);
      expect(final['Spoilage']).toBeGreaterThan(0);
    });

    it('should model customer lifecycle funnel', () => {
      const spec = `
[Leads] > Qualified @ 100
Qualified > Trials @ Conversion(0.3)
Trials > Customers @ Conversion(0.5)
Customers > Churned @ Leak(0.05)
Churned > [Lost] @ Rate(1)
      `;

      const model = parse(spec);
      const results = model.run(12);

      const final = results[results.length - 1];

      // Should have active customers with some churn
      expect(final['Customers']).toBeGreaterThan(0);
      expect(final['Churned']).toBeGreaterThan(0);
    });
  });

  describe('Performance and scale', () => {
    it('should handle large number of rounds', () => {
      const m = new Model('LargeRounds');
      const a = m.infiniteStock('a');
      const b = m.stock('b', new Formula(0));
      m.flow(a, b, new Rate(1));

      const results = m.run(100);

      expect(results.length).toBe(101); // 0 + 100 rounds
      expect(results[100]['b']).toBe(100);
    });

    it('should handle many stocks', () => {
      const m = new Model('ManyStocks');

      for (let i = 0; i < 50; i++) {
        m.stock(`stock${i}`, new Formula(i));
      }

      const results = m.run(5);

      expect(Object.keys(results[0]).length).toBe(50);
    });

    it('should handle many flows', () => {
      const m = new Model('ManyFlows');
      const source = m.infiniteStock('source');

      for (let i = 0; i < 50; i++) {
        const dest = m.stock(`dest${i}`, new Formula(0));
        m.flow(source, dest, new Rate(1));
      }

      const results = m.run(5);
      const final = results[results.length - 1];

      // Each destination should have received flow
      for (let i = 0; i < 50; i++) {
        expect(final[`dest${i}`]).toBe(5);
      }
    });
  });
});
