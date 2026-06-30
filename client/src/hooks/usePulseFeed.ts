import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import type { PulseEvent } from '../lib/pulse-store';
import { isStaticMode } from '../lib/staticApi';

export function usePulseFeed(options?: { pollMs?: number; enabled?: boolean; limit?: number }) {
  const pollMs = options?.pollMs ?? 4000;
  const enabled = options?.enabled ?? true;
  const limit = options?.limit ?? 40;

  const [pulses, setPulses] = useState<PulseEvent[]>([]);
  const [stats, setStats] = useState<{ total: number; latest: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sinceRef = useRef<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const data = await api.kernelPulses(sinceRef.current, limit);
      setError(null);
      const incoming = data.pulses as PulseEvent[];
      if (incoming.length) {
        setPulses((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const novel = incoming.filter((p) => !seen.has(p.id));
          if (!novel.length) return prev;
          sinceRef.current = novel[0]?.at ?? sinceRef.current;
          return [...novel, ...prev].slice(0, limit);
        });
      }
      if (data.stats) {
        setStats({ total: data.stats.total, latest: data.stats.latest });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pulse feed unavailable');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    if (isStaticMode()) return;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [enabled, pollMs, refresh]);

  const emit = useCallback(
    async (from: string, payload?: unknown) => {
      const result = await api.kernelPulse(from, payload, { action: 'ui.manual' });
      if (result.ok && 'event' in result && result.event) {
        setPulses((prev) => [result.event as PulseEvent, ...prev].slice(0, limit));
      }
      await refresh();
      return result;
    },
    [refresh, limit],
  );

  return { pulses, stats, loading, error, refresh, emit };
};