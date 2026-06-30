/** Pure telemetry for the AFS Recursive Spiral Engine — mirrors the standalone HTML scaffold. */

export type SpiralMode = 'double' | 'single' | 'compressive' | 'expansive';
export type ChiralityMode = 'mirrored' | 'opposite' | 'alternating' | 'locked';
export type SynthesisGrade = 'EOT' | 'DCS' | 'RCS' | 'RDTQ';

export interface SpiralParams {
  n: number;
  spread: number;
  rot: number;
  res: number;
  comp: number;
  mass: number;
  chiMode: ChiralityMode;
}

export interface SpiralTelemetry extends SpiralParams {
  even: boolean;
  shellDistance: string;
  coherence: number;
  nodal: number;
  energy: number;
  chiralityBalance: number;
  synthesisGrade: SynthesisGrade;
  parityLabel: string;
  orientationLabel: string;
}

const C_LIGHT = 299_792_458;

export function synthesisGradeFromCoherence(coherence: number): SynthesisGrade {
  if (coherence < 0.5) return 'EOT';
  if (coherence < 0.65) return 'DCS';
  if (coherence < 0.8) return 'RCS';
  return 'RDTQ';
}

export function parityExponent(n: number): string {
  const map: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  };
  return String(n).split('').map((c) => map[c] ?? c).join('');
}

export function computeSpiralTelemetry(p: SpiralParams): SpiralTelemetry {
  const even = p.n % 2 === 0;
  const shellDistance = ((6.7 / Math.max(1, p.n)) * p.spread).toFixed(2);
  const coherence = Math.max(
    0,
    Math.min(
      1,
      (even ? 0.56 : 0.43) + p.res * 0.2 + p.spread * 0.05
        - Math.abs(p.comp - 1) * 0.13 - Math.max(0, p.n - 8) * 0.025,
    ),
  );
  const nodal = Math.max(
    0,
    Math.min(
      1,
      coherence * 0.72 + (1 / (1 + Math.abs(p.comp - 1))) * 0.18 + Math.min(1, p.rot / 0.025) * 0.1,
    ),
  );
  const energy = p.mass * C_LIGHT ** 2;
  const chiBase =
    p.chiMode === 'mirrored' ? 0.5
    : p.chiMode === 'opposite' ? 0.72
    : p.chiMode === 'alternating' ? 0.88
    : 0.93;
  const chiralityBalance = Math.max(
    0,
    Math.min(1, chiBase + p.res * 0.04 - Math.abs(p.comp - 1) * 0.05 - Math.max(0, p.n - 10) * 0.015),
  );
  const synthesisGrade = synthesisGradeFromCoherence(coherence);
  const exp = parityExponent(p.n);

  return {
    ...p,
    even,
    shellDistance,
    coherence,
    nodal,
    energy,
    chiralityBalance,
    synthesisGrade,
    parityLabel: even
      ? `♾️🌀${exp} → AFS↑ outward topology`
      : `🍁${exp} → DFS↓ inward topology`,
    orientationLabel: even ? 'Even / AFS↑ outward' : 'Odd / DFS↓ inward',
  };
}

export const SPIRAL_PRESETS = {
  balanced: { mode: 'double' as SpiralMode, chi: 'mirrored' as ChiralityMode, n: 4, spread: 1, rot: 0.012, res: 0.92, comp: 0.8, mass: 1 },
  ascendant: { mode: 'double' as SpiralMode, chi: 'opposite' as ChiralityMode, n: 6, spread: 1.12, rot: 0.014, res: 1.12, comp: 0.62, mass: 1 },
  descendant: { mode: 'double' as SpiralMode, chi: 'alternating' as ChiralityMode, n: 5, spread: 0.88, rot: 0.011, res: 1, comp: 1.28, mass: 1.3 },
  kohinoor: { mode: 'compressive' as SpiralMode, chi: 'locked' as ChiralityMode, n: 7, spread: 0.72, rot: 0.009, res: 1.25, comp: 1.68, mass: 2.3 },
  redleaf: { mode: 'expansive' as SpiralMode, chi: 'alternating' as ChiralityMode, n: 8, spread: 1.46, rot: 0.017, res: 1.44, comp: 0.42, mass: 0.8 },
  single: { mode: 'single' as SpiralMode, chi: 'mirrored' as ChiralityMode, n: 3, spread: 1.18, rot: 0.01, res: 0.85, comp: 0.9, mass: 1 },
  gyro: { mode: 'double' as SpiralMode, chi: 'alternating' as ChiralityMode, n: 4, spread: 1.22, rot: 0.004, res: 1.08, comp: 0.84, mass: 1.4 },
} as const;

export type SpiralPresetName = keyof typeof SPIRAL_PRESETS;