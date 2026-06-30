import { useCallback, useState } from 'react';
import { api, type KernelGenerateResult } from '../lib/api';

export function useKernelGenerate(onSuccess?: () => void) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<KernelGenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await api.kernelGenerate();
      setResult(data);
      onSuccess?.();
      return data;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Runtime generation failed';
      setError(message);
      throw e;
    } finally {
      setGenerating(false);
    }
  }, [onSuccess]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { generating, result, error, generate, reset };
}