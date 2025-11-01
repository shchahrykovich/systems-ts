import { describe, it, expect } from 'vitest';
import { Model, Formula, Rate } from '../src';

describe('Model Rendering', () => {
  describe('Model.render()', () => {
    it('should render simple model output', () => {
      const m = new Model('Test');
      const a = m.stock('a', new Formula(10));
      const b = m.stock('b', new Formula(0));
      m.flow(a, b, new Rate(5));

      const results = m.run(2);
      const output = m.render(results);

      // Should have header with stock names
      expect(output).toContain('a');
      expect(output).toContain('b');

      // Should have round numbers (0, 1, 2)
      const lines = output.split('\n');
      expect(lines.length).toBe(4); // header + 3 data rows
    });

    it('should not show infinite stocks in output', () => {
      const m = new Model('Test');
      const a = m.infiniteStock('infinite');
      const b = m.stock('visible', new Formula(0));
      m.flow(a, b, new Rate(5));

      const results = m.run(2);
      const output = m.render(results);

      expect(output).not.toContain('infinite');
      expect(output).toContain('visible');
    });

    it('should render with custom separator', () => {
      const m = new Model('Test');
      m.stock('a', new Formula(10));
      m.stock('b', new Formula(5));

      const results = m.run(1);
      const output = m.render(results, ',');

      expect(output).toContain(',');
      expect(output).not.toContain('\t');
    });

    it('should render without padding when pad=false', () => {
      const m = new Model('Test');
      m.stock('a', new Formula(1));
      m.stock('b', new Formula(100));

      const results = m.run(1);
      const outputPadded = m.render(results, '\t', true);
      const outputUnpadded = m.render(results, '\t', false);

      // Padded should be longer due to spaces
      expect(outputUnpadded.length).toBeLessThanOrEqual(outputPadded.length);
    });

    it('should handle empty model', () => {
      const m = new Model('Empty');
      const results = m.run(0);
      const output = m.render(results);

      // Should still have header row
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle model with only infinite stocks', () => {
      const m = new Model('AllInfinite');
      m.infiniteStock('a');
      m.infiniteStock('b');

      const results = m.run(1);
      const output = m.render(results);

      // Should render but with no stock columns
      const lines = output.split('\n');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should format large numbers correctly', () => {
      const m = new Model('Large');
      m.stock('big', new Formula(999999));

      const results = m.run(1);
      const output = m.render(results);

      expect(output).toContain('999999');
    });

    it('should format decimal numbers correctly', () => {
      const m = new Model('Decimals');
      m.stock('decimal', new Formula('3.14'));

      const results = m.run(1);
      const output = m.render(results);

      expect(output).toContain('3.14');
    });

    it('should render multiple rounds correctly', () => {
      const m = new Model('MultiRound');
      const a = m.stock('a', new Formula(20));
      const b = m.stock('b', new Formula(0));
      m.flow(a, b, new Rate(5));

      const results = m.run(4);
      const output = m.render(results);

      const lines = output.split('\n');
      // header + 5 data rows (rounds 0-4)
      expect(lines.length).toBe(6);

      // Each line should start with round number
      expect(lines[1]).toMatch(/^0/);
      expect(lines[2]).toMatch(/^1/);
      expect(lines[3]).toMatch(/^2/);
      expect(lines[4]).toMatch(/^3/);
      expect(lines[5]).toMatch(/^4/);
    });

    it('should handle stock names with different lengths', () => {
      const m = new Model('VaryingLengths');
      m.stock('a', new Formula(1));
      m.stock('verylongstockname', new Formula(2));
      m.stock('mid', new Formula(3));

      const results = m.run(1);
      const output = m.render(results);

      expect(output).toContain('a');
      expect(output).toContain('verylongstockname');
      expect(output).toContain('mid');
    });

    it('should render complex hiring funnel', () => {
      const m = new Model('Hiring');
      const candidates = m.infiniteStock('Candidates');
      const phone = m.stock('PhoneScreens', new Formula(0));
      const onsites = m.stock('Onsites', new Formula(0));

      m.flow(candidates, phone, new Rate(25));
      m.flow(phone, onsites, new Rate(5));

      const results = m.run(3);
      const output = m.render(results);

      expect(output).toContain('PhoneScreens');
      expect(output).toContain('Onsites');
      expect(output).not.toContain('Candidates'); // infinite stock

      const lines = output.split('\n');
      expect(lines.length).toBe(5); // header + 4 rounds
    });

    it('should align columns properly with padding', () => {
      const m = new Model('Alignment');
      m.stock('short', new Formula(1));
      m.stock('longerName', new Formula(100));

      const results = m.run(1);
      const output = m.render(results, '\t', true);

      const lines = output.split('\n');
      const header = lines[0];

      // Header should have stock names
      expect(header).toContain('short');
      expect(header).toContain('longerName');
    });
  });
});
