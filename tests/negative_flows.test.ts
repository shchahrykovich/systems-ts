import { describe, it, expect } from 'vitest';
import { parse } from '../src/index';

describe('Negative Flow Rates', () => {
  it('should allow stocks to go negative when flow rate formula is negative', () => {
    const spec = `[Hires] > Developers(10) @ 5
[Plans] > Changes @ (Developers - Incidents) * 2
Changes > Latent(1000) @ Conversion(1 / (1 + Remediated))
Latent > Incidents @ 10
Incidents > Mitigated @ Rate(1 + (Developers / 100))
Mitigated > Remediated @ 1`;

    const model = parse(spec);
    const results = model.run(10);

    // Expected values from the correct output
    const expected = [
      { round: 0, Developers: 10, Changes: 0, Latent: 1000, Incidents: 0, Mitigated: 0, Remediated: 0 },
      { round: 1, Developers: 15, Changes: 20, Latent: 990, Incidents: 10, Mitigated: 0, Remediated: 0 },
      { round: 2, Developers: 20, Changes: 12.3, Latent: 1000, Incidents: 18.85, Mitigated: 1.15, Remediated: 0 },
      { round: 3, Developers: 25, Changes: 4.7, Latent: 1002, Incidents: 27.65, Mitigated: 1.35, Remediated: 1 },
      { round: 4, Developers: 30, Changes: -2.8, Latent: 994, Incidents: 36.4, Mitigated: 1.6, Remediated: 2 },
      { round: 5, Developers: 35, Changes: -10.2, Latent: 983, Incidents: 45.1, Mitigated: 1.9, Remediated: 3 },
      { round: 6, Developers: 40, Changes: -17.5, Latent: 970, Incidents: 53.75, Mitigated: 2.25, Remediated: 4 },
      { round: 7, Developers: 45, Changes: -24.7, Latent: 956, Incidents: 62.35, Mitigated: 2.65, Remediated: 5 },
      { round: 8, Developers: 50, Changes: -31.8, Latent: 941, Incidents: 70.9, Mitigated: 3.1, Remediated: 6 },
      { round: 9, Developers: 55, Changes: -38.8, Latent: 926, Incidents: 79.4, Mitigated: 3.6, Remediated: 7 },
      { round: 10, Developers: 60, Changes: -45.7, Latent: 911, Incidents: 87.85, Mitigated: 4.15, Remediated: 8 },
    ];

    // Verify key rounds where Changes goes negative
    expect(results[4].Changes).toBeCloseTo(-2.8, 1);
    expect(results[5].Changes).toBeCloseTo(-10.2, 1);
    expect(results[10].Changes).toBeCloseTo(-45.7, 1);

    // Verify all rounds
    results.forEach((snapshot, i) => {
      const exp = expected[i];
      expect(snapshot.Developers, `Round ${i} Developers`).toBe(exp.Developers);
      expect(snapshot.Changes, `Round ${i} Changes`).toBeCloseTo(exp.Changes, 1);
      expect(snapshot.Latent, `Round ${i} Latent`).toBeCloseTo(exp.Latent, 1);
      expect(snapshot.Incidents, `Round ${i} Incidents`).toBeCloseTo(exp.Incidents, 1);
      expect(snapshot.Mitigated, `Round ${i} Mitigated`).toBeCloseTo(exp.Mitigated, 1);
      expect(snapshot.Remediated, `Round ${i} Remediated`).toBeCloseTo(exp.Remediated, 1);
    });
  });

  it('should handle formula-based negative rates', () => {
    const spec = `a(10) > b(5) @ a - b`;
    const model = parse(spec);
    const results = model.run(2);

    // Round 0: a=10, b=5
    // Rate = a - b = 10 - 5 = 5
    // Round 1: a=5, b=10
    // Rate = a - b = 5 - 10 = -5
    // Round 2: a=10, b=5
    expect(results[0].a).toBe(10);
    expect(results[0].b).toBe(5);
    expect(results[1].a).toBe(5);
    expect(results[1].b).toBe(10);
    expect(results[2].a).toBe(10);
    expect(results[2].b).toBe(5);
  });
});
