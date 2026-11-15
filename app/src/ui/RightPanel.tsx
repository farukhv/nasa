import type { EnvState, PlanResult, RouteResult, SceneMeta } from '../engine/types';
import type { SceneDef } from '../scenes';
import type { PlannerConfig } from '../engine/config';
import { useI18n } from '../i18n';
import { Row, Prov, Verdict, fmt } from './bits';
import { dustEffects, sunElevation } from '../engine/physio';

export interface RoverPov { [poiId: string]: { sol: number; site: number; drive: string; waypoint: { x: number; y: number; elev: number } | null; images: { file: string; az: number; el: number; lmst: string | null; id: string }[]; credit: string } }
interface Props {
  def: SceneDef; meta: SceneMeta; result: PlanResult | null; baseline: PlanResult | null; active: RouteResult | null; activeId: 'A' | 'B'; setActiveId: (id: 'A' | 'B') => void;
  cfg: PlannerConfig; budgets: { o2: number; water: number; minutes: number }; env: EnvState; selectedPoi: string | null; roverPov: RoverPov | null;
  verdict: { level: 'go' | 'caution' | 'nogo' | 'idle'; text: string; reason: string };
}

function Delta({ v, unit, d = 0, invert = false }: { v: number; unit?: string; d?: number; invert?: boolean }) {
  if (!Number.isFinite(v) || Math.abs(v) < Math.pow(10, -d) / 2) return null;
  const bad = invert ? v < 0 : v > 0;
  return <span className={`delta ${bad ? 'up' : 'down'}`}> {v > 0 ? '+' : ''}{v.toFixed(d)}{unit ?? ''}</span>;
}

type CompareRow = [string, (r: RouteResult) => string, string, (r: RouteResult) => number, string, number, boolean];

export default function RightPanel(p: Props) {
  const { t } = useI18n();
  const s = t.side, min = t.u.min;
  const { def, meta, result, baseline, active, cfg, budgets, env } = p;
  const poi = def.pois.find(q => q.id === p.selectedPoi) ?? null;
  const pov = poi && p.roverPov ? p.roverPov[poi.id] : null;
  const end = active?.points[active.points.length - 1];
  const o2Left = end ? budgets.o2 - end.o2Kg : budgets.o2;
  const el = sunElevation(env.ltst, (meta.lat0 + meta.lat1) / 2, env.ls), dust = dustEffects(cfg, env.tau, el);
  const A = result?.routes.find(r => r.id === 'A') ?? null, B = result?.routes.find(r => r.id === 'B') ?? null, S = result?.straight ?? null;
  const base = baseline && baseline !== result ? baseline.routes.find(r => r.id === 'A') ?? null : null;
  const win = result?.window;
  const mm = active?.minMargin;
  const marginCls = !mm ? '' : mm.kg < 0 ? 'bad' : mm.min < 20 ? 'warn' : 'ok';
  const place = (id: string) => (id === 'START' ? s.start : id === 'BASE' ? s.habitat : id);
  const visibility = dust.visM > 1e5 ? '>100' : fmt(dust.visM / 1000, 1);
  const rows: CompareRow[] = [
    [s.distance, r => `${fmt(r.totals.distM)} m`, S ? `${fmt(S.distM)} m` : '', r => r.totals.distM - (base?.totals.distM ?? r.totals.distM), ' m', 0, false],
    [s.time, r => `${fmt(r.totals.tMin)} ${min}`, '—', r => r.totals.tMin - (base?.totals.tMin ?? r.totals.tMin), ` ${min}`, 0, false],
    ['O₂', r => `${fmt(r.totals.o2Kg, 3)} kg`, S ? `${fmt(S.o2Kg, 3)} kg` : '', r => r.totals.o2Kg - (base?.totals.o2Kg ?? r.totals.o2Kg), ' kg', 3, false],
    [s.minSafety, r => fmt(r.score.Smin), S ? fmt(S.minS) : '', r => r.score.Smin - (base?.score.Smin ?? r.score.Smin), '', 0, true],
    [s.vetoCells, () => '0', S ? String(S.vetoCells) : '', () => 0, '', 0, false],
    [s.minMarginShort, r => `${fmt(r.minMargin.kg, 3)}`, '—', r => r.minMargin.kg - (base?.minMargin.kg ?? r.minMargin.kg), '', 3, true],
    [s.scienceV, r => fmt(r.score.V), '—', r => r.score.V - (base?.score.V ?? r.score.V), '', 0, true],
    [s.confidenceC, r => fmt(r.score.C), '—', () => 0, '', 0, true],
    [s.maxShelter, r => `${fmt(r.maxTimeToShelterMin)} ${min}`, '—', r => r.maxTimeToShelterMin - (base?.maxTimeToShelterMin ?? r.maxTimeToShelterMin), ` ${min}`, 0, false],
  ];
  return (
    <div className="side">
      <div className="decision" data-tour="decision">
        <Verdict level={p.verdict.level} text={p.verdict.text} />
        <div className="reason">{p.verdict.reason}</div>
        {active && (
          <div className="margins">
            <div><div className="label">{s.minMargin}</div><div className={`n ${marginCls}`}>{mm && mm.kg >= 0 ? '+' : ''}{fmt(mm?.kg ?? NaN, 3)}<span className="unit">kg</span></div><div className="why" style={{ margin: 0 }}>{s.marginAt(fmt(mm?.min ?? NaN), fmt(mm?.atM ?? NaN))}{base && <Delta v={(mm?.kg ?? 0) - base.minMargin.kg} unit=" kg" d={3} invert />}</div></div>
            <div><div className="label">{s.noReturn}</div><div className={`n ${active.pointOfNoReturn !== null ? 'bad' : 'ok'}`}>{active.pointOfNoReturn !== null ? `${fmt(active.points[active.pointOfNoReturn].distM)} m` : s.none}</div><div className="why" style={{ margin: 0 }}>{env.sep && result?.shelterCountdownMin != null ? s.toShelter(fmt(result.shelterCountdownMin)) : s.farthestShelter(fmt(active.maxTimeToShelterMin))}</div></div>
          </div>
        )}
        {active?.warnings.slice(1).map((w, i) => <div key={i} className="warn" style={{ fontSize: 11, marginTop: 6 }}>▲ {w}</div>)}
      </div>

      {A && (
        <div className="sec">
          <h3>{s.compare} {base && <span className="delta">{s.deltaNote}</span>}</h3>
          <table className="cmp">
            <thead><tr><th>{s.metric}</th><th>A</th>{B && <th>B</th>}{S && <th>{s.straight}</th>}</tr></thead>
            <tbody>
              {rows.map(([k, fn, sv, dfn, unit, d, inv]) => (
                <tr key={k}><td>{k}</td>
                  <td className={p.activeId === 'A' ? 'active' : ''}>{fn(A)}{base && <Delta v={dfn(A)} unit={unit} d={d} invert={inv} />}</td>
                  {B && <td className={p.activeId === 'B' ? 'active' : ''}>{fn(B)}</td>}
                  {S && <td style={{ color: 'var(--text-2)' }}>{sv}</td>}</tr>
              ))}
              <tr><td>{s.utility}</td><td className={p.activeId === 'A' ? 'active' : ''}>{fmt(A.score.U)}</td>{B && <td className={p.activeId === 'B' ? 'active' : ''}>{fmt(B.score.U)}</td>}{S && <td />}</tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className={`btn sm ${p.activeId === 'A' ? 'primary' : ''}`} onClick={() => p.setActiveId('A')}>{s.useA}</button>
            {B && <button className={`btn sm ${p.activeId === 'B' ? 'primary' : ''}`} onClick={() => p.setActiveId('B')}>{s.useB} {B.diversity !== undefined && s.overlap(fmt(100 * B.diversity))}</button>}
          </div>
          {S && S.vetoCells > 0 && <div className="why" style={{ marginTop: 6 }}>{s.straightNote(S.vetoCells, fmt(S.minS), fmt(100 * (A.totals.distM / S.distM - 1)))}</div>}
        </div>
      )}

      {active && (
        <div className="sec">
          <h3>{s.why}</h3>
          <ul className="whylist">{active.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          {result?.skipped.length ? <div className="why warn">{s.skippedTargets}: {result.skipped.map(k => `${k.id} (${k.reason})`).join('; ')}</div> : null}
        </div>
      )}

      <div className="sec">
        <h3>{s.consumables}</h3>
        <div className="kpis">
          <div className={`kpi ${o2Left < budgets.o2 * 0.1 ? 'bad' : o2Left < budgets.o2 * 0.25 ? 'warn' : ''}`}><div className="label">{s.o2Left}</div><div className="big">{fmt(o2Left, 3)}<span className="unit">kg / {budgets.o2}</span></div></div>
          <div className={`kpi ${end && end.waterKg > budgets.water ? 'bad' : ''}`}><div className="label">{s.water}</div><div className="big">{end ? fmt(budgets.water - end.waterKg, 2) : '—'}<span className="unit">kg</span></div></div>
          <div className={`kpi ${active && active.totals.tMin > budgets.minutes ? 'bad' : ''}`}><div className="label">{s.duration}</div><div className="big">{active ? fmt(active.totals.tMin) : '—'}<span className="unit">{min}</span></div></div>
        </div>
        <div className="why" style={{ marginTop: 6 }}>{s.o2Note(fmt(cfg.water.basalW + cfg.o2.nominalKgPerH * cfg.water.wPerKgO2PerH))}</div>
      </div>

      {win && win.hours.length > 0 && (
        <div className="sec">
          <h3>{s.window} <Prov p="Modelled" /></h3>
          <svg width="100%" height="54" viewBox="0 0 288 54" preserveAspectRatio="none">
            {win.hours.map((h, i) => { const x = (h.ltst - 6) / 12 * 288, w = 288 / 24; const col = h.score >= 70 ? 'var(--safe)' : h.score >= 45 ? 'var(--caution)' : 'var(--nogo)'; return <g key={i}><rect x={x} y={8} width={w + 0.5} height={18} fill={col} opacity={0.8} />{h.dustDevil && <rect x={x} y={8} width={w + 0.5} height={18} fill="url(#dd)" />}</g>; })}
            <defs><pattern id="dd" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 4 L4 0" stroke="var(--bg-2)" strokeWidth="1.2" /></pattern></defs>
            {win.recommendedStart !== null && <g><rect x={(win.recommendedStart - 6) / 12 * 288} y={4} width={(active ? active.totals.tMin / 60 : 1) / 12 * 288} height={26} fill="none" stroke="var(--comms)" strokeWidth={1.5} /></g>}
            <rect x={(env.ltst - 6) / 12 * 288 - 1} y={2} width={2} height={30} fill="var(--science)" />
            {[6, 9, 12, 15, 18].map(h => <text key={h} x={(h - 6) / 12 * 288} y={48} fontSize="10" fill="var(--text-2)" fontFamily="JetBrains Mono" textAnchor={h === 6 ? 'start' : h === 18 ? 'end' : 'middle'}>{h}:00</text>)}
          </svg>
          <div className="why">{s.windowStart} <b className="ok">{win.recommendedStart !== null ? `${Math.floor(win.recommendedStart)}:${String(Math.round((win.recommendedStart % 1) * 60)).padStart(2, '0')}` : '—'}</b> {s.windowNote}</div>
        </div>
      )}

      {active && (
        <div className="sec">
          <h3>{s.legs} — {active.label}</h3>
          <table className="legs"><thead><tr><th>{s.leg}</th><th>m</th><th>{min}</th><th>O₂ kg</th></tr></thead>
            <tbody>{active.legs.map((l, i) => <tr key={i}><td>{place(l.from)} → {place(l.to)}</td><td>{fmt(l.distM)}</td><td>{fmt(l.tMin)}</td><td>{fmt(l.o2Kg, 3)}</td></tr>)}</tbody></table>
          <div className="why" style={{ marginTop: 6 }}>{s.sheltersNote(active.havens.some(h => h.id === 'ROVER'), active.havens.filter(h => h.id.startsWith('W')).map(h => `${h.id} (${h.note})`).join(' · '))}{env.buddy && s.buddyLoss(fmt(active.buddyLosLossPct))}</div>
        </div>
      )}

      <div className="sec">
        <details><summary>{s.environment(fmt(el), visibility, fmt(dust.solar, 2))}</summary>
          <Row k={s.sunElevation} v={fmt(el)} unit="°" /><Row k={s.visibility} v={visibility} unit="km" /><Row k={s.solarFactor} v={fmt(dust.solar, 2)} /><Row k={s.season} v={fmt(env.ls)} unit="°" /><Row k={s.dustSeason} v={env.ls >= 180 ? s.dustYes : s.no} />
        </details>
        <details><summary>{s.decisionLog(result?.explain.length ?? 0, result ? `${result.timingMs.total} ms` : '')}</summary>
          <div className="log">{result?.explain.map((e, i) => <div key={i}>{e}</div>)}{result && <div>{s.timing}: {Object.entries(result.timingMs).map(([k, v]) => `${k} ${v} ms`).join(' · ')}</div>}</div>
        </details>
        <details><summary>{s.dataSources}</summary>
          {def.dataTypes.map((d, i) => <div key={i} className="why">• {d}</div>)}
          <div className="why">{s.provenance}: {Object.entries(meta.provenance).map(([k, v]) => <span key={k}>{k}<Prov p={v} /> </span>)}</div>
          {meta.rock_anchor && <div className="why">{s.rockAnchor((meta.rock_anchor.k_bg * 100).toFixed(1), (meta.rock_anchor.k_hi * 100).toFixed(0))} <Prov p={meta.id === 'insight' ? 'Observed' : 'Assumed'} /> {meta.id === 'insight' ? s.rockAnchorInsight : s.rockAnchorOther}</div>}
        </details>
      </div>

      <div className="sec">
        <h3>{s.arrive} {pov && <Prov p="Observed" />}</h3>
        {poi ? (
          <div>
            <div style={{ fontWeight: 600 }}>{poi.name}</div>
            <div className="why">{poi.note}<br /><span style={{ color: 'var(--text-3)' }}>{s.source}: {poi.source}</span></div>
            {pov ? (
              <div className="pov">
                <div className="why">{s.roverPassed(pov.waypoint ? `${Math.hypot((pov.waypoint.x - poi.x) * meta.cell_dx, (pov.waypoint.y - poi.y) * meta.cell_dy).toFixed(0)} m` : '?', pov.sol, pov.site, pov.drive)}</div>
                {pov.images.map(im => <div key={im.id}><img src={im.file} alt={im.id} loading="lazy" /><small>{s.imageMeta(im.az.toFixed(0), im.el.toFixed(0))} · {im.lmst ?? ''} · {pov.credit}</small></div>)}
              </div>
            ) : <div className="why">{s.noRoverImage}</div>}
          </div>
        ) : <div className="why">{s.clickTarget}</div>}
        <details style={{ marginTop: 6 }}><summary>{s.referenceImages}</summary><div className="pov">{def.povImages.map((im, i) => <div key={i}><img src={im.src} alt={im.title} loading="lazy" /><small><b>{im.title}</b> — {im.credit}. {im.note}</small></div>)}</div></details>
      </div>
    </div>
  );
}
