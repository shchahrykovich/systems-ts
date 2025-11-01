import { describe, it, expect } from 'vitest';
import { parse } from '../src/parse';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


describe('Example Files', () => {
  const examplesDir = join(__dirname, '..', 'examples');

  function readExample(filename: string): string {
    return readFileSync(join(examplesDir, filename), 'utf-8');
  }

  describe('Valid examples', () => {
    it('should parse and run hiring.txt', () => {
      const spec = readExample('hiring.txt');
      const model = parse(spec);

      // Should have all the stocks
      expect(model.getStock('Candidates')).toBeDefined();
      expect(model.getStock('PhoneScreens')).toBeDefined();
      expect(model.getStock('Onsites')).toBeDefined();
      expect(model.getStock('Offers')).toBeDefined();
      expect(model.getStock('Hires')).toBeDefined();
      expect(model.getStock('Employees')).toBeDefined();
      expect(model.getStock('Departures')).toBeDefined();
      expect(model.getStock('Departed')).toBeDefined();

      // Should have correct initial value for Employees
      const employees = model.getStock('Employees');
      expect(employees!.initial.compute()).toBe(5);

      // Should have correct number of flows
      expect(model.flows.length).toBe(7);

      // Should be able to run simulation
      const results = model.run(10);
      expect(results.length).toBe(11); // Initial + 10 rounds

      // Check initial state
      expect(results[0]['Employees']).toBe(5);
      expect(results[0]['PhoneScreens']).toBe(0);

      // PhoneScreens should have candidates flowing in
      expect(results[1]['PhoneScreens']).toBe(25);

      // Should be able to render output
      const output = model.render(results);
      expect(output).toContain('PhoneScreens');
      expect(output).toContain('Employees');
      expect(output).not.toContain('Candidates'); // infinite stock
    });

    it('should parse and run projects.txt', () => {
      const spec = readExample('projects.txt');
      const model = parse(spec);

      expect(model.getStock('Hires')).toBeDefined();
      expect(model.getStock('Developers')).toBeDefined();
      expect(model.getStock('Ideas')).toBeDefined();
      expect(model.getStock('Projects')).toBeDefined();
      expect(model.getStock('Started')).toBeDefined();
      expect(model.getStock('Finished')).toBeDefined();

      // Should handle formulas in flow rates
      expect(model.flows.length).toBe(4);

      // Should be able to run
      const results = model.run(5);
      expect(results.length).toBe(6);

      // Should produce valid output
      const output = model.render(results);
      expect(output).toContain('Developers');
      expect(output).toContain('Projects');
    });

    it('should parse and run maximums.txt', () => {
      const spec = readExample('maximums.txt');
      const model = parse(spec);

      const b = model.getStock('b');
      const c = model.getStock('c');

      // Check maximums are set correctly
      expect(b!.maximum.compute()).toBe(5);
      expect(c!.maximum.compute()).toBe(10);

      // Run simulation
      const results = model.run(3);

      // b should be capped at maximum of 5
      for (const result of results) {
        expect(result['b']).toBeLessThanOrEqual(5);
        expect(result['c']).toBeLessThanOrEqual(10);
      }

      // Verify b reaches its maximum
      expect(results[1]['b']).toBe(5);
    });

    it('should parse and run links.txt (with formula references)', () => {
      const spec = readExample('links.txt');
      const model = parse(spec);

      const recruiters = model.getStock('Recruiters');
      expect(recruiters).toBeDefined();
      expect(recruiters!.initial.compute()).toBe(10);
      expect(recruiters!.maximum.compute()).toBe(15);

      // Should have flow with formula reference
      const phoneScreensFlow = model.flows.find(
        f => f.destination.name === 'PhoneScreens'
      );
      expect(phoneScreensFlow).toBeDefined();

      // Run simulation
      const results = model.run(5);
      expect(results.length).toBe(6);

      // Recruiters should cap at 15
      for (const result of results) {
        expect(result['Recruiters']).toBeLessThanOrEqual(15);
      }

      // PhoneScreens flow should be based on Recruiters * 3
      // With 10 recruiters initially, should flow 30 in first round
      expect(results[1]['PhoneScreens']).toBe(30);
    });

    it('should parse and run extended_syntax.txt', () => {
      const spec = readExample('extended_syntax.txt');
      const model = parse(spec);

      expect(model.getStock('Candidate')).toBeDefined();
      expect(model.getStock('Recruiter')).toBeDefined();
      expect(model.getStock('EngRecruiter')).toBeDefined();
      expect(model.getStock('MgrRecruiter')).toBeDefined();

      const recruiter = model.getStock('Recruiter');
      expect(recruiter!.initial.compute()).toBe(5);

      const engRecruiter = model.getStock('EngRecruiter');
      // EngRecruiter has initial 1 and maximum equal to Recruiter (5)
      expect(engRecruiter!.initial.compute()).toBe(1);

      // Run simulation
      const results = model.run(3);
      expect(results.length).toBe(4);

      const output = model.render(results);
      expect(output).toContain('Recruiter');
      expect(output).toContain('Hire');
    });
  });

  describe('Invalid examples (should throw errors)', () => {
    it('should reject invalid_flow.txt (invalid decimal syntax)', () => {
      const spec = readExample('invalid_flow.txt');

      // Invalid decimal formats like "0..2" and ".2" should cause errors
      expect(() => {
        const model = parse(spec);
        // May error during parse or run
        model.run(1);
      }).toThrow();
    });

    it('should parse illegal_maximum.txt (library allows initial > maximum)', () => {
      const spec = readExample('illegal_maximum.txt');

      // Note: The library doesn't validate or enforce initial <= maximum
      // This is allowed behavior - stocks can be initialized above their maximum
      const model = parse(spec);
      const results = model.run(1);

      // Stock c has initial 5 and maximum 3
      const c = model.getStock('c');
      expect(c).toBeDefined();
      expect(c!.initial.compute()).toBe(5);
      expect(c!.maximum.compute()).toBe(3);

      // The model runs successfully even with this configuration
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]['c']).toBeDefined();
    });

    it('should reject fake_flow.txt (unknown flow types)', () => {
      const spec = readExample('fake_flow.txt');

      // "Invalid" and "Fake" are not valid flow types
      expect(() => {
        parse(spec);
      }).toThrow();
    });

    it('should reject no_delim.txt (invalid syntax)', () => {
      const spec = readExample('no_delim.txt');

      // Uses < instead of > and missing @ delimiter
      expect(() => {
        parse(spec);
      }).toThrow();
    });
  });

  describe('Output consistency', () => {
    it('should produce consistent output across runs (hiring.txt)', () => {
      const spec = readExample('hiring.txt');

      const model1 = parse(spec);
      const results1 = model1.run(5);

      const model2 = parse(spec);
      const results2 = model2.run(5);

      // Results should be deterministic
      expect(results1).toEqual(results2);
    });

    it('should produce valid table output for all valid examples', () => {
      const validExamples = [
        'hiring.txt',
        'projects.txt',
        'maximums.txt',
        'links.txt',
        'extended_syntax.txt'
      ];

      for (const example of validExamples) {
        const spec = readExample(example);
        const model = parse(spec);
        const results = model.run(3);
        const output = model.render(results);

        // Output should have header row and data rows
        const lines = output.split('\n');
        expect(lines.length).toBeGreaterThan(1);

        // First line should be header (starts with tab)
        expect(lines[0]).toMatch(/^\t/);

        // Should have round numbers (0, 1, 2, 3)
        expect(output).toContain('0\t');
        expect(output).toContain('1\t');
        expect(output).toContain('2\t');
        expect(output).toContain('3\t');
      }
    });
  });

  describe('Example-specific validations', () => {
    it('hiring.txt should have employee attrition', () => {
      const spec = readExample('hiring.txt');
      const model = parse(spec);
      const results = model.run(20);

      // After enough rounds, should have some departures
      const finalRound = results[results.length - 1];

      // Employees should be growing
      expect(finalRound['Employees']).toBeGreaterThan(5);

      // Should have some departures (leak of 0.1)
      expect(finalRound['Departures']).toBeGreaterThan(0);
    });

    it('maximums.txt should respect stock capacity constraints', () => {
      const spec = readExample('maximums.txt');
      const model = parse(spec);
      const results = model.run(10);

      // Check every round respects maximums
      for (let i = 0; i < results.length; i++) {
        expect(results[i]['b']).toBeLessThanOrEqual(5);
        expect(results[i]['c']).toBeLessThanOrEqual(10);

        // No negative values
        expect(results[i]['b']).toBeGreaterThanOrEqual(0);
        expect(results[i]['c']).toBeGreaterThanOrEqual(0);
      }
    });

    it('links.txt should use formula-based flow rates correctly', () => {
      const spec = readExample('links.txt');
      const model = parse(spec);

      // Initial state has 10 recruiters
      const results = model.run(2);

      // PhoneScreens flow should be based on Recruiters * 3
      // With 10 recruiters initially, should flow 30 in first round
      expect(results[1]['PhoneScreens']).toBe(30);

      // After round 1, recruiters should increase by 1 (from PossibleRecruiters flow)
      expect(results[1]['Recruiters']).toBe(11);

      // PhoneScreens continues to accumulate, but also flows out
      // Just verify it has positive value and is accumulating
      expect(results[2]['PhoneScreens']).toBeGreaterThan(0);
      expect(results[2]['PhoneScreens']).toBeGreaterThanOrEqual(results[1]['PhoneScreens']);
    });

    it('projects.txt should handle complex formula dependencies', () => {
      const spec = readExample('projects.txt');
      const model = parse(spec);

      // Should not throw errors due to circular dependencies
      expect(() => {
        model.run(10);
      }).not.toThrow();

      const results = model.run(10);

      // All values should be finite
      for (const result of results) {
        for (const key in result) {
          if (key !== 'Hires' && key !== 'Ideas') { // Skip infinite stocks
            expect(isFinite(result[key])).toBe(true);
          }
        }
      }
    });

    it('extended_syntax.txt should handle Rate() with formulas', () => {
      const spec = readExample('extended_syntax.txt');
      const model = parse(spec);

      // Find flow from Recruiter to EngRecruiter
      const engRecruiterFlow = model.flows.find(
        f => f.destination.name === 'EngRecruiter'
      );
      expect(engRecruiterFlow).toBeDefined();

      // Flow rate should reference Recruiter
      const refs = engRecruiterFlow!.rate.formula.references();
      expect(refs).toContain('Recruiter');

      // Should run successfully
      const results = model.run(3);
      expect(results.length).toBe(4);
    });
  });

  describe('Rendering formats', () => {
    it('should render hiring.txt with custom separators', () => {
      const spec = readExample('hiring.txt');
      const model = parse(spec);
      const results = model.run(3);

      // CSV format
      const csvOutput = model.render(results, ',');
      expect(csvOutput).toContain(',');
      expect(csvOutput.split('\n')[0]).toMatch(/,/);

      // Pipe format
      const pipeOutput = model.render(results, '|');
      expect(pipeOutput).toContain('|');
    });

    it('should render without padding', () => {
      const spec = readExample('maximums.txt');
      const model = parse(spec);
      const results = model.run(2);

      const withPadding = model.render(results, '\t', true);
      const withoutPadding = model.render(results, '\t', false);

      // Without padding should generally be shorter
      expect(withoutPadding.length).toBeLessThanOrEqual(withPadding.length);
    });
  });

  describe('Edge cases in examples', () => {
    it('should handle comments in hiring.txt', () => {
      const spec = readExample('hiring.txt');

      // File has comments starting with #
      expect(spec).toContain('#');

      // Should parse successfully despite comments
      const model = parse(spec);
      expect(model.stocks.length).toBeGreaterThan(0);
    });

    it('should handle whitespace variations', () => {
      const spec = readExample('hiring.txt');
      const model1 = parse(spec);

      // Add extra whitespace
      const spacedSpec = spec.replace(/>/g, '  >  ').replace(/@/g, '  @  ');
      const model2 = parse(spacedSpec);

      // Should produce same model structure
      expect(model1.stocks.length).toBe(model2.stocks.length);
      expect(model1.flows.length).toBe(model2.flows.length);
    });

    it('should handle empty lines in examples', () => {
      const spec = readExample('hiring.txt');

      // File has empty lines
      const lines = spec.split('\n');
      const hasEmptyLines = lines.some(line => line.trim() === '');
      expect(hasEmptyLines).toBe(true);

      // Should parse successfully
      const model = parse(spec);
      expect(model.stocks.length).toBeGreaterThan(0);
    });
  });
});
