import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { FlowGraph, KernelNavItem, KernelTopology } from '../lib/red-leaf-kernel';
import type { PulseEvent } from '../lib/pulse-store';

export function useRedLeafKernel() {
  const [topology, setTopology] = useState<KernelTopology | null>(null);
  const [nav, setNav] = useState<KernelNavItem[]>([]);
  const [flow, setFlow] = useState<FlowGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, n, f] = await Promise.all([api.kernel(), api.kernelNav(), api.kernelFlow()]);
      setTopology(k);
      setNav(n.nav);
      setFlow(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kernel unfold failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pulse = useCallback(async (from: string, payload?: unknown) => {
    return api.kernelPulse(from, payload);
  }, []);

  return { topology, nav, flow, loading, error, refresh, pulse };
}