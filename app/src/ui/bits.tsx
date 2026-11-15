import type { ReactNode } from 'react';
import type { Provenance } from '../engine/config';

export const fmt = (v: number, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');

export function Row({ k, v, unit, cls }: { k: ReactNode; v: ReactNode; unit?: string; cls?: string }) {
  return <div className="row"><span className="k">{k}</span><span className={`v ${cls ?? ''}`}>{v}{unit && <span className="unit">{unit}</span>}</span></div>;
}

export function Toggle({ label, on, set, hint }: { label: string; on: boolean; set: (v: boolean) => void; hint?: string }) {
  return <label className="toggle"><span>{label}{hint && <small style={{ display: 'block', color: 'var(--text-3)' }}>{hint}</small>}</span><input type="checkbox" checked={on} onChange={e => set(e.target.checked)} /></label>;
}

export function Slider({ label, v, set, min, max, step, unit, fmtv }: { label: string; v: number; set: (v: number) => void; min: number; max: number; step: number; unit?: string; fmtv?: (v: number) => string }) {
  return <div className="slider"><span>{label}</span><span className="v">{fmtv ? fmtv(v) : v}{unit && <span className="unit">{unit}</span>}</span>
    <input type="range" min={min} max={max} step={step} value={v} onChange={e => set(parseFloat(e.target.value))} /></div>;
}

export function Prov({ p }: { p: Provenance | 'Spec' | string }) {
  const m: Record<string, [string, string]> = { Observed: ['obs', 'Gözlenen'], Derived: ['der', 'Türetilmiş'], Modelled: ['mod', 'Modellenmiş'], Assumed: ['ass', 'Varsayım'], Spec: ['der', 'Ekip spek.'] };
  const [c, t] = m[p] ?? ['', p];
  return <span className={`chip ${c}`}>{t}</span>;
}

export function Verdict({ level, text }: { level: 'go' | 'caution' | 'nogo' | 'idle'; text: string }) {
  return <span className={`verdict ${level}`}><i className="shape" />{text}</span>;
}
