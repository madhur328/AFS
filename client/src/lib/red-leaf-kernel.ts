/**
 * Red Leaf Kernel — client mirror of server unfold engine (Iteration 1).
 * Static mode computes locally from the same seed grammar.
 */

export const RED_LEAF_SEED = '🍁';

export interface KernelModule {
  id: string;
  symbol: string;
  path: string;
  label: string;
  branch: string;
  operator: string;
  operatorSymbol: string;
  vector: string;
  depth: number;
  glyph: string;
  api: { primary: string; read: string[]; write: string[] };
  emits: string[];
  dataSources: string[];
  dataSinks: string[];
}

export interface KernelNavItem {
  id: string;
  to: string;
  label: string;
  symbol: string;
  branch: string;
  operator: string;
}

export interface KernelTopology {
  seed: string;
  version: number;
  iteration: number;
  paradox: {
    equation: string;
    mantra: string;
    operators: Record<string, { symbol: string; fn: string; polar: string }>;
  };
  axiom: string;
  generatedAt: string;
  topology: {
    branches: Array<{
      id: string;
      operator: string;
      symbol: string;
      label: string;
      vector: string;
      moduleIds: string[];
      modules: KernelModule[];
    }>;
    modules: KernelModule[];
    nodeCount: number;
  };
  invariant: {
    singleSeed: string;
    allSymbolsContainSeed: boolean;
    moduleCount: number;
    branchCount: number;
  };
}

export interface FlowEdge {
  from: string;
  to: string;
  fromSymbol?: string;
  toSymbol?: string;
  kind: string;
}

export interface FlowGraph {
  seed: string;
  nodes: Array<{ id: string; symbol: string; label: string; reads: string[]; writes: string[] }>;
  edges: FlowEdge[];
  edgeCount: number;
}

export interface PulseTrace {
  hop: number;
  module: string;
  symbol: string;
  via: string | null;
  action: 'emit' | 'receive';
}

export type PulseResult =
  | {
      ok: true;
      seed: string;
      paradox?: string;
      origin?: { id: string; symbol: string };
      payload?: unknown;
      trace?: PulseTrace[];
      reach?: number;
      hops?: number;
    }
  | {
      ok: false;
      error: string;
      seed?: string;
    };

/** Branch colors for UI visualization */
export const BRANCH_COLORS: Record<string, string> = {
  seed: 'text-forge-gold',
  reframe: 'text-forge-leaf',
  transform: 'text-forge-cyan',
  optimize: 'text-forge-ember',
};

export const BRANCH_BG: Record<string, string> = {
  seed: 'border-forge-gold/30 bg-forge-gold/5',
  reframe: 'border-forge-leaf/30 bg-forge-leaf/5',
  transform: 'border-forge-cyan/30 bg-forge-cyan/5',
  optimize: 'border-forge-ember/30 bg-forge-ember/5',
};