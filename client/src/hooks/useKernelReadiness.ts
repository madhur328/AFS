import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { KernelReadiness } from '../lib/kernel-readiness';

export function useKernelReadiness(options?: { pollMs?: number; enabled?: boolean }) {
  const pollMs = options?.pollMs ?? 30_000;
  const enabled = options?.enabled ?? true;

  const [readiness, setReadiness] = useState<KernelReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.kernelReady();
      setReadiness(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Readiness check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [enabled, pollMs, refresh]);

  return {
    readiness,
    loading,
    error,
    refresh,
    generationReady: readiness?.generationReady ?? false,
    observabilityReady: readiness?.observabilityReady ?? false,
  };
}