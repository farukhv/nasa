import type { ReactNode } from 'react';
import type { Provenance } from '../engine/config';
import { useI18n } from '../i18n';

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

const PROVENANCE_CLASS: Record<string, string> = { Observed: 'obs', Derived: 'der', Modelled: 'mod', Assumed: 'ass', Spec: 'der' };

export function Prov({ p }: { p: Provenance | 'Spec' | string }) {
  const { t } = useI18n();
  const label = (t.provenance as Record<string, string>)[p] ?? p;
  return <span className={`chip ${PROVENANCE_CLASS[p] ?? ''}`}>{label}</span>;
}

export function Verdict({ level, text }: { level: 'go' | 'caution' | 'nogo' | 'idle'; text: string }) {
  return <span className={`verdict ${level}`}><i className="shape" />{text}</span>;
}
