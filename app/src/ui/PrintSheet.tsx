import type { RouteResult } from '../engine/types';
import type { PlannerConfig } from '../engine/config';
import type { SceneDef } from '../scenes';
import { useI18n } from '../i18n';
import { fmt } from './bits';

/** Apollo-style cuff checklist: printed with Ctrl+P / key P. Hidden on screen. */
export default function PrintSheet({ def, active, cfg, budgets, verdict }: { def: SceneDef; active: RouteResult | null; cfg: PlannerConfig; budgets: { o2: number; water: number; minutes: number }; verdict: { text: string; reason: string } }) {
  const { t } = useI18n();
  const s = t.print, min = t.u.min;
  const place = (id: string) => (id === 'START' ? t.side.start : id === 'BASE' ? t.side.habitat : id);
  return (
    <div className="printonly">
      <h1>{s.title} — {def.title}</h1>
      <p>{def.region} · {s.decision}: <b>{verdict.text}</b> — {verdict.reason}</p>
      {active ? (
        <>
          <table><thead><tr><th>#</th><th>{s.leg}</th><th>m</th><th>{min}</th><th>O₂ kg</th><th>{s.cumulative}</th></tr></thead>
            <tbody>{(() => { let acc = 0; return active.legs.map((l, i) => { acc += l.tMin; return <tr key={i}><td>{i + 1}</td><td>{place(l.from)} → {place(l.to)}</td><td>{fmt(l.distM)}</td><td>{fmt(l.tMin)}</td><td>{fmt(l.o2Kg, 3)}</td><td>{fmt(acc)}</td></tr>; }); })()}</tbody></table>
          <h2>{s.rules}</h2>
          <ol>
            <li>{s.ruleWalkBack(cfg.o2.reserveFactor, fmt(active.minMargin.kg, 3), fmt(active.minMargin.min), fmt(active.minMargin.atM))}</li>
            <li>{s.ruleNoReturn(active.pointOfNoReturn !== null ? fmt(active.points[active.pointOfNoReturn].distM) : null)}</li>
            <li>{s.ruleShelters(active.havens.some(h => h.id === 'ROVER'), active.havens.filter(h => h.id.startsWith('W')).map(h => h.id).join(', '), fmt(active.maxTimeToShelterMin))}</li>
            <li>{s.ruleSep}</li>
            <li>{s.ruleBudgets(budgets.o2, budgets.water, budgets.minutes, cfg.o2.maxSampleKg)}</li>
            <li>{s.ruleVeto(cfg.veto.E, cfg.veto.K)}</li>
          </ol>
          <h2>{s.why}</h2><ul>{active.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </>
      ) : <p>{s.noRoute}</p>}
      <p style={{ fontSize: 10 }}>Martian Map · NASA Space Apps 2026 · {s.data}: {def.dataTypes.join('; ')}</p>
    </div>
  );
}
