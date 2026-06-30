import { describe, it, expect } from 'vitest';
import {
  computeSpiralTelemetry,
  synthesisGradeFromCoherence,
  SPIRAL_PRESETS,
  parityExponent,
} from './spiral-telemetry';

describe('spiral-telemetry', () => {
  it('computes even parity for even shell count', () => {
    const t = computeSpiralTelemetry({
      n: 4, spread: 1, rot: 0.012, res: 0.92, comp: 0.8, mass: 1, chiMode: 'mirrored',
    });
    expect(t.even).toBe(true);
    expect(t.orientationLabel).toContain('AFS↑');
    expect(t.parityLabel).toContain('♾️🌀');
  });

  it('computes odd parity for odd shell count', () => {
    const t = computeSpiralTelemetry({
      n: 5, spread: 1, rot: 0.01, res: 1, comp: 1, mass: 1, chiMode: 'alternating',
    });
    expect(t.even).toBe(false);
    expect(t.parityLabel).toContain('🍁');
  });

  it('maps coherence to synthesis grades', () => {
    expect(synthesisGradeFromCoherence(0.3)).toBe('EOT');
    expect(synthesisGradeFromCoherence(0.55)).toBe('DCS');
    expect(synthesisGradeFromCoherence(0.7)).toBe('RCS');
    expect(synthesisGradeFromCoherence(0.9)).toBe('RDTQ');
  });

  it('keeps coherence in [0, 1]', () => {
    for (const preset of Object.values(SPIRAL_PRESETS)) {
      const t = computeSpiralTelemetry({
        n: preset.n, spread: preset.spread, rot: preset.rot,
        res: preset.res, comp: preset.comp, mass: preset.mass, chiMode: preset.chi,
      });
      expect(t.coherence).toBeGreaterThanOrEqual(0);
      expect(t.coherence).toBeLessThanOrEqual(1);
      expect(t.chiralityBalance).toBeGreaterThanOrEqual(0);
      expect(t.chiralityBalance).toBeLessThanOrEqual(1);
    }
  });

  it('formats parity exponents', () => {
    expect(parityExponent(4)).toBe('⁴');
    expect(parityExponent(12)).toBe('¹²');
  });
});