import { describe, it, expect } from 'vitest';
import { parse } from '../src';

describe('Parse', () => {
  describe('Simple stock declarations', () => {
    it('should parse a single stock', () => {
      const spec = 'MyStock';
      const model = parse(spec);
      const stock = model.getStock('MyStock');

      expect(stock).toBeDefined();
      expect(stock!.name).toBe('MyStock');
      expect(stock!.initial.compute()).toBe(0);
      expect(stock!.maximum.compute()).toBe(Number.POSITIVE_INFINITY);
    });

    it('should parse stock with initial value', () => {
      const spec = 'MyStock(10)';
      const model = parse(spec);
      const stock = model.getStock('MyStock');

      expect(stock).toBeDefined();
      expect(stock!.initial.compute()).toBe(10);
      expect(stock!.maximum.compute()).toBe(Number.POSITIVE_INFINITY);
    });

    it('should parse stock with initial and maximum values', () => {
      const spec = 'MyStock(5, 20)';
      const model = parse(spec);
      const stock = model.getStock('MyStock');

      expect(stock).toBeDefined();
      expect(stock!.initial.compute()).toBe(5);
      expect(stock!.maximum.compute()).toBe(20);
    });

    it('should parse infinite stock', () => {
      const spec = '[InfiniteStock]';
      const model = parse(spec);
      const stock = model.getStock('InfiniteStock');

      expect(stock).toBeDefined();
      expect(stock!.initial.compute()).toBe(Number.POSITIVE_INFINITY);
      expect(stock!.show).toBe(false);
    });
  });

  describe('Flow declarations', () => {
    it('should parse basic rate flow', () => {
      const spec = 'a > b @ 5';
      const model = parse(spec);

      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
      expect(model.flows[0].source.name).toBe('a');
      expect(model.flows[0].destination.name).toBe('b');
    });

    it('should parse conversion flow (decimal)', () => {
      const spec = 'a(10) > b @ 0.5';
      const model = parse(spec);

      expect(model.flows.length).toBe(1);
      expect(model.flows[0].rate.constructor.name).toBe('Conversion');
    });

    it('should parse explicit Rate', () => {
      const spec = 'a > b @ Rate(5)';
      const model = parse(spec);

      expect(model.flows[0].rate.constructor.name).toBe('Rate');
    });

    it('should parse explicit Conversion', () => {
      const spec = 'a > b @ Conversion(0.5)';
      const model = parse(spec);

      expect(model.flows[0].rate.constructor.name).toBe('Conversion');
    });

    it('should parse explicit Leak', () => {
      const spec = 'a > b @ Leak(0.2)';
      const model = parse(spec);

      expect(model.flows[0].rate.constructor.name).toBe('Leak');
    });
  });

  describe('Complex specifications', () => {
    it('should parse hiring funnel example', () => {
      const spec = `
[Candidates] > PhoneScreens @ 25
PhoneScreens > Onsites @ 0.5
Onsites > Offers @ 0.5
Offers > Hires @ 0.5
Hires > Employees(5) @ 1.0
Employees > Departures @ Leak(0.1)
Departures > [Departed] @ 1.0
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(8);
      expect(model.flows.length).toBe(7);
    });

    it('should run hiring funnel and produce results', () => {
      const spec = `
[Candidates] > PhoneScreens @ 25
PhoneScreens > Onsites @ 0.5
Onsites > Offers @ 0.5
Offers > Hires @ 0.5
Hires > Employees(5) @ 1.0
Employees > Departures @ Leak(0.1)
Departures > [Departed] @ 1.0
`;

      const model = parse(spec);
      const results = model.run(3);

      expect(results.length).toBe(4); // 0 + 3 rounds
      expect(results[0]['Employees']).toBe(5); // Initial value
      expect(results[0]['PhoneScreens']).toBe(0);
    });
  });

  describe('Comments', () => {
    it('should ignore comments', () => {
      const spec = `
# This is a comment
a > b @ 5
# Another comment
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
    });

    it('should handle multiple consecutive comments', () => {
      const spec = `
# First comment
# Second comment
# Third comment
a > b @ 5
# Fourth comment
# Fifth comment
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
    });

    it('should handle comments at the beginning of file', () => {
      const spec = `# This is a comment at the start
a > b @ 5`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
    });

    it('should handle comments at the end of file', () => {
      const spec = `a > b @ 5
# This is a comment at the end`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
    });

    it('should handle comments with special characters', () => {
      const spec = `
# Comment with special chars: @><()[]!@#$%^&*
a > b @ 5
# Another comment with symbols: +-*/=
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
    });

    it('should handle empty comments', () => {
      const spec = `
#
a > b @ 5
#
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
    });

    it('should handle comments mixed with empty lines', () => {
      const spec = `
# First comment

a > b @ 5

# Middle comment

b > c @ 3

# Last comment
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(3);
      expect(model.flows.length).toBe(2);
    });

    it('should handle comment-only file', () => {
      const spec = `
# Comment 1
# Comment 2
# Comment 3
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(0);
      expect(model.flows.length).toBe(0);
    });

    it('should support inline comments after code', () => {
      const spec = `a > b @ 5  # This is an inline comment`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
      expect(model.flows[0].rate.formula.compute()).toBe(5);
    });

    it('should support inline comments in complex specs', () => {
      const spec = `
LowPriority > FixedLow @ Leak(0.02)        # Only 2% fixed per round
MediumPriority > FixedMedium @ Leak(0.15)  # 15% fixed per round
HighPriority > FixedHigh @ Leak(0.5)       # 50% fixed per round
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(6);
      expect(model.flows.length).toBe(3);
    });

    it('should support inline comments after stock declarations', () => {
      const spec = `
Managers(2)  # Initial managers
Engineers(Managers * 4)  # 4 engineers per manager
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      const results = model.run(0);
      expect(results[0]['Managers']).toBe(2);
      expect(results[0]['Engineers']).toBe(8);
    });

    it('should handle inline comments with special characters', () => {
      const spec = `a > b @ 5  # Comment with @><()[]!@#$%^&*`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
    });

    it('should handle inline comments immediately after code', () => {
      const spec = `a > b @ 5# No space before comment`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(2);
      expect(model.flows.length).toBe(1);
      expect(model.flows[0].rate.formula.compute()).toBe(5);
    });
  });

  describe('Formula references', () => {
    it('should handle formula with stock references', () => {
      const spec = `
Recruiters(3)
[Candidates] > Engineers @ Recruiters * 6
`;

      const model = parse(spec);
      const results = model.run(1);

      // Should flow 3 * 6 = 18 engineers in first round
      expect(results[1]['Engineers']).toBe(18);
    });

    it('should handle initial values with references', () => {
      const spec = `
Managers(2)
Engineers(Managers * 4)
`;

      const model = parse(spec);
      const results = model.run(0);

      expect(results[0]['Managers']).toBe(2);
      expect(results[0]['Engineers']).toBe(8);
    });
  });

  describe('Stock reuse', () => {
    it('should allow stocks to be referenced multiple times', () => {
      const spec = `
a(10) > b @ 5
b > c @ 3
`;

      const model = parse(spec);
      expect(model.stocks.length).toBe(3);
      expect(model.flows.length).toBe(2);

      const b = model.getStock('b');
      expect(b).toBeDefined();
      expect(b!.initial.compute()).toBe(0);
    });

    it('should update stock parameters on reuse', () => {
      const spec = `
a > b @ 5
b(10) > c @ 3
`;

      const model = parse(spec);
      const b = model.getStock('b');
      expect(b!.initial.compute()).toBe(10);
    });
  });
});
