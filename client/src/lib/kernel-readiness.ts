export interface KernelRequirement {
  id: string;
  label: string;
  detail: string;
  pass: boolean;
  errors?: string[];
  error?: string;
  unfoldBytes?: number;
  budgetBytes?: number;
  kernelModules?: number;
  generatedRoutes?: number;
  generatedAt?: string | null;
  runtimeGeneration?: boolean;
}

export interface KernelStrategyPhase {
  id: string;
  label: string;
  status: 'active' | 'blocked' | 'planned';
  detail: string;
}

export interface KernelSpiralTelemetry {
  seed: string;
  iteration: number;
  operator: string;
  pulsesHandled: number;
  actionsRun: number;
  invalidations: number;
  byModule: Record<string, { pulses: number; actions: number }>;
  cache: { entries: number; hits: number; misses: number; hitRate: number | null; invalidations: number };
  edgeCount: number;
  handlerModules: number;
}

export interface KernelReadiness {
  seed: string;
  iteration: number;
  strategy: {
    title: string;
    summary: string;
    phases: KernelStrategyPhase[];
  };
  observabilityReady: boolean;
  generationReady: boolean;
  ready: boolean;
  requirements: KernelRequirement[];
  metrics: {
    moduleCount: number;
    routeCount: number;
    unfoldBytes: number;
    unfoldBudgetBytes: number;
  };
  spiral?: KernelSpiralTelemetry | null;
  store?: {
    entries: number;
    hits: number;
    misses: number;
    hitRate: number | null;
    invalidations: number;
    sets: number;
    byModule: Record<string, number>;
  };
  checkedAt: string;
}