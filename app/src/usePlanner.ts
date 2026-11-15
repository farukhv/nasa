import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlanRequest, PlanResult, POI, SceneMeta } from './engine/types';
import type { PlannerConfig } from './engine/config';

export interface LoadedScene { meta: SceneMeta; elev: Float32Array; cls: Uint8Array; K: Uint8Array; E: Uint8Array; H: Uint8Array; SVF: Uint8Array; DV: Uint8Array }

export function usePlanner() {
  const workerRef = useRef<Worker | null>(null);
  const [scene, setScene] = useState<LoadedScene | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    const w = new Worker(new URL('./workers/planner.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    w.onmessage = (ev: MessageEvent) => {
      const m = ev.data;
      if (m.type === 'progress') setProgress(m.p);
      else if (m.type === 'loaded') { setScene({ meta: m.meta, elev: m.elev, cls: m.cls, K: m.K, E: m.E, H: m.H, SVF: m.SVF, DV: m.DV }); setProgress(1); }
      else if (m.type === 'plan') { if (m.token === tokenRef.current) { setResult(m.res); setBusy(false); } }
      else if (m.type === 'error') { setError(m.message); setBusy(false); console.error(m.stack); }
    };
    return () => w.terminate();
  }, []);

  const load = useCallback((id: string) => {
    setScene(null); setResult(null); setProgress(0); setError(null);
    workerRef.current?.postMessage({ type: 'load', id, base: '/scenes' });
  }, []);

  const plan = useCallback((cfg: PlannerConfig, req: PlanRequest, pois: POI[]) => {
    const token = ++tokenRef.current;
    setBusy(true); setError(null);
    workerRef.current?.postMessage({ type: 'plan', token, cfg, req, pois });
  }, []);

  return { scene, progress, result, busy, error, load, plan };
}
