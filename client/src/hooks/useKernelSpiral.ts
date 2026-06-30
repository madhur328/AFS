import { useCallback, useEffect, useState } from 'react';
import { api, type KernelSpiralTelemetry } from '../lib/api';

export function useKernelSpiral(options?: { pollMs?: number; enabled?: boolean }) {
  const pollMs = options?.pollMs ?? 10_000;
  const enabled = options?.enabled ?? true;

  const [telemetry, setTelemetry] = useState<KernelSpiralTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.kernelSpiral();
      setTelemetry(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Spiral telemetry unavailable');
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

  return { telemetry, loading, error, refresh };
}