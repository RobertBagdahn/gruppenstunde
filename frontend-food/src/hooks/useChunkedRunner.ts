import { useCallback, useRef, useState } from 'react';

export interface ChunkResult {
  /** Items handled in this chunk. */
  processed: number;
  /** Items still waiting after this chunk. */
  remaining: number;
  errors?: string[];
}

export interface ChunkedRunnerState {
  running: boolean;
  processed: number;
  remaining: number | null;
  total: number | null;
  errors: string[];
}

const INITIAL_STATE: ChunkedRunnerState = {
  running: false,
  processed: 0,
  remaining: null,
  total: null,
  errors: [],
};

/**
 * Drives a server-side queue chunk by chunk until it is empty or stopped.
 * Every chunk is a short request, so long jobs survive Cloud Run CPU throttling.
 */
export function useChunkedRunner(runChunk: () => Promise<ChunkResult>, onChunkDone?: () => void) {
  const [state, setState] = useState<ChunkedRunnerState>(INITIAL_STATE);
  const stopRequested = useRef(false);

  const start = useCallback(async () => {
    stopRequested.current = false;
    setState({ ...INITIAL_STATE, running: true });
    let processed = 0;
    let total: number | null = null;
    const errors: string[] = [];
    try {
      while (!stopRequested.current) {
        const result = await runChunk();
        processed += result.processed;
        total ??= result.processed + result.remaining;
        errors.push(...(result.errors ?? []));
        setState({ running: true, processed, remaining: result.remaining, total, errors: [...errors] });
        onChunkDone?.();
        // No progress means the rest cannot be handled automatically — stop instead of looping.
        if (result.remaining === 0 || result.processed === 0) break;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setState((prev) => ({ ...prev, running: false, errors: [...errors] }));
    }
  }, [runChunk, onChunkDone]);

  const stop = useCallback(() => {
    stopRequested.current = true;
  }, []);

  const progress =
    state.total && state.total > 0 ? Math.min(100, Math.round((state.processed / state.total) * 100)) : 0;

  return { ...state, progress, start, stop };
}
