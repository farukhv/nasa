import type { EnvState, PlanResult, RouteResult, SceneMeta } from '../engine/types';
import type { SceneDef } from '../scenes';
import type { PlannerConfig } from '../engine/config';
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

export default function RightPanel(p: Props) {
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
  return (
    <div className="side">
      <div className="decision">
        <Verdict level={p.verdict.level} text={p.verdict.text} />
        <div className="reason">{p.verdict.reason}</div>
        {active && (
          <div className="margins">
            <div><div className="label">Min walk-back marjı</div><div className={`n ${marginCls}`}>{mm && mm.kg >= 0 ? '+' : ''}{fmt(mm?.kg ?? NaN, 3)}<span className="unit">kg</span></div><div className="why" style={{ margin: 0 }}>≈ {fmt(mm?.min ?? NaN)} dk · {fmt(mm?.atM ?? NaN)} m'de{base && <Delta v={(mm?.kg ?? 0) - base.minMargin.kg} unit=" kg" d={3} invert />}</div></div>
            <div><div className="label">Dönüşü olmayan nokta</div><div className={`n ${active.pointOfNoReturn !== null ? 'bad' : 'ok'}`}>{active.pointOfNoReturn !== null ? `${fmt(active.points[active.pointOfNoReturn].distM)} m` : 'yok'}</div><div className="why" style={{ margin: 0 }}>{env.sep && result?.shelterCountdownMin != null ? `Sığınağa ${fmt(result.shelterCountdownMin)} dk` : `Sığınağa en uzak ${fmt(active.maxTimeToShelterMin)} dk`}</div></div>
          </div>
        )}
        {active?.warnings.slice(1).map((w, i) => <div key={i} className="warn" style={{ fontSize: 11, marginTop: 6 }}>▲ {w}</div>)}
      </div>

      {A && (
        <div className="sec">
          <h3>Rota karşılaştırması {base && <span className="delta">Δ = nominal plana göre</span>}</h3>
          <table className="cmp">
            <thead><tr><th>Ölçüt</th><th>A</th>{B && <th>B</th>}{S && <th>Düz çizgi</th>}</tr></thead>
            <tbody>
              {([
                ['Mesafe', (r: RouteResult) => `${fmt(r.totals.distM)} m`, S ? `${fmt(S.distM)} m` : '', (r: RouteResult) => r.totals.distM - (base?.totals.distM ?? r.totals.distM), ' m', 0, false],
                ['Süre', (r: RouteResult) => `${fmt(r.totals.tMin)} dk`, '—', (r: RouteResult) => r.totals.tMin - (base?.totals.tMin ?? r.totals.tMin), ' dk', 0, false],
                ['O₂', (r: RouteResult) => `${fmt(r.totals.o2Kg, 3)} kg`, S ? `${fmt(S.o2Kg, 3)} kg` : '', (r: RouteResult) => r.totals.o2Kg - (base?.totals.o2Kg ?? r.totals.o2Kg), ' kg', 3, false],
                ['Min güvenlik', (r: RouteResult) => fmt(r.score.Smin), S ? fmt(S.minS) : '', (r: RouteResult) => r.score.Smin - (base?.score.Smin ?? r.score.Smin), '', 0, true],
                ['Veto hücresi', () => '0', S ? String(S.vetoCells) : '', () => 0, '', 0, false],
                ['Min marj', (r: RouteResult) => `${fmt(r.minMargin.kg, 3)}`, '—', (r: RouteResult) => r.minMargin.kg - (base?.minMargin.kg ?? r.minMargin.kg), '', 3, true],
                ['Bilim V', (r: RouteResult) => fmt(r.score.V), '—', (r: RouteResult) => r.score.V - (base?.score.V ?? r.score.V), '', 0, true],
                ['Güven C', (r: RouteResult) => fmt(r.score.C), '—', () => 0, '', 0, true],
                ['Sığınağa maks', (r: RouteResult) => `${fmt(r.maxTimeToShelterMin)} dk`, '—', (r: RouteResult) => r.maxTimeToShelterMin - (base?.maxTimeToShelterMin ?? r.maxTimeToShelterMin), ' dk', 0, false],
              ] as [string, (r: RouteResult) => string, string, (r: RouteResult) => number, string, number, boolean][]).map(([k, fn, sv, dfn, unit, d, inv]) => (
                <tr key={k}><td>{k}</td>
                  <td className={p.activeId === 'A' ? 'active' : ''}>{fn(A)}{base && <Delta v={dfn(A)} unit={unit} d={d} invert={inv} />}</td>
                  {B && <td className={p.activeId === 'B' ? 'active' : ''}>{fn(B)}</td>}
                  {S && <td style={{ color: 'var(--text-2)' }}>{sv}</td>}</tr>
              ))}
              <tr><td>Fayda U = 0.6S + 0.4V</td><td className={p.activeId === 'A' ? 'active' : ''}>{fmt(A.score.U)}</td>{B && <td className={p.activeId === 'B' ? 'active' : ''}>{fmt(B.score.U)}</td>}{S && <td />}</tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button className={`btn sm ${p.activeId === 'A' ? 'primary' : ''}`} onClick={() => p.setActiveId('A')}>A aktif</button>
            {B && <button className={`btn sm ${p.activeId === 'B' ? 'primary' : ''}`} onClick={() => p.setActiveId('B')}>B aktif {B.diversity !== undefined && `(örtüşme %${fmt(100 * B.diversity)})`}</button>}
          </div>
          {S && S.vetoCells > 0 && <div className="why" style={{ marginTop: 6 }}>Düz çizgi {S.vetoCells} veto hücresinden geçer (min S {fmt(S.minS)}); A rotası {fmt(100 * (A.totals.distM / S.distM - 1))}% daha uzun ama hiç veto hücresine girmez.</div>}
        </div>
      )}

      {active && (
        <div className="sec">
          <h3>Neden bu rota?</h3>
          <ul className="whylist">{active.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          {result?.skipped.length ? <div className="why warn">Atlanan hedefler: {result.skipped.map(s => `${s.id} (${s.reason})`).join('; ')}</div> : null}
        </div>
      )}

      <div className="sec">
        <h3>Tüketilebilirler (rota sonu)</h3>
        <div className="kpis">
          <div className={`kpi ${o2Left < budgets.o2 * 0.1 ? 'bad' : o2Left < budgets.o2 * 0.25 ? 'warn' : ''}`}><div className="label">O₂ kalan</div><div className="big">{fmt(o2Left, 3)}<span className="unit">kg / {budgets.o2}</span></div></div>
          <div className={`kpi ${end && end.waterKg > budgets.water ? 'bad' : ''}`}><div className="label">Su</div><div className="big">{end ? fmt(budgets.water - end.waterKg, 2) : '—'}<span className="unit">kg</span></div></div>
          <div className={`kpi ${active && active.totals.tMin > budgets.minutes ? 'bad' : ''}`}><div className="label">Süre</div><div className="big">{active ? fmt(active.totals.tMin) : '—'}<span className="unit">dk</span></div></div>
        </div>
        <div className="why" style={{ marginTop: 6 }}>O₂ metabolik vekildir: aynı metabolik hız CO₂, ısı ve soğutma yükünü de sürer (≈ {fmt((cfg.water.basalW + cfg.o2.nominalKgPerH * cfg.water.wPerKgO2PerH))} W nominal). Soğutma suyu "ısı atım eşdeğeri" (6 mbar'da süblimatör marjinal; teknoloji varsayım).</div>
      </div>

      {win && win.hours.length > 0 && (
        <div className="sec">
          <h3>EVA saat penceresi <Prov p="Modelled" /></h3>
          <svg width="100%" height="54" viewBox="0 0 288 54" preserveAspectRatio="none">
            {win.hours.map((h, i) => { const x = (h.ltst - 6) / 12 * 288, w = 288 / 24; const col = h.score >= 70 ? '#1F8A68' : h.score >= 45 ? '#C2820F' : '#C92B73'; return <g key={i}><rect x={x} y={8} width={w + 0.5} height={18} fill={col} opacity={0.8} />{h.dustDevil && <rect x={x} y={8} width={w + 0.5} height={18} fill="url(#dd)" />}</g>; })}
            <defs><pattern id="dd" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 4 L4 0" stroke="#FBF8F1" strokeWidth="1.2" /></pattern></defs>
            {win.recommendedStart !== null && <g><rect x={(win.recommendedStart - 6) / 12 * 288} y={4} width={(active ? active.totals.tMin / 60 : 1) / 12 * 288} height={26} fill="none" stroke="#26201C" strokeWidth={1.5} /></g>}
            <rect x={(env.ltst - 6) / 12 * 288 - 1} y={2} width={2} height={30} fill="#2166C9" />
            {[6, 9, 12, 15, 18].map(h => <text key={h} x={(h - 6) / 12 * 288} y={48} fontSize="10" fill="#6E5A4B" fontFamily="JetBrains Mono" textAnchor={h === 6 ? 'start' : h === 18 ? 'end' : 'middle'}>{h}:00</text>)}
          </svg>
          <div className="why">Önerilen başlangıç <b className="ok">{win.recommendedStart !== null ? `${Math.floor(win.recommendedStart)}:${String(Math.round((win.recommendedStart % 1) * 60)).padStart(2, '0')}` : '—'}</b> LTST (beyaz çerçeve = EVA süresi; gün batımından en az 2 saat önce biter). Taralı 11:00–14:00: toz şeytanı tepe penceresi (Jezero MEDA, Newman 2022). Kırmızı: düşük güneş / soğuk / gölge cezası. Siyan çizgi: seçili saat.</div>
        </div>
      )}

      {active && (
        <div className="sec">
          <h3>Bacaklar — {active.label}</h3>
          <table className="legs"><thead><tr><th>Bacak</th><th>m</th><th>dk</th><th>O₂ kg</th></tr></thead>
            <tbody>{active.legs.map((l, i) => <tr key={i}><td>{l.from === 'START' ? 'Başlangıç' : l.from === 'BASE' ? 'Habitat' : l.from} → {l.to === 'BASE' ? 'Habitat' : l.to}</td><td>{fmt(l.distM)}</td><td>{fmt(l.tMin)}</td><td>{fmt(l.o2Kg, 3)}</td></tr>)}</tbody></table>
          <div className="why" style={{ marginTop: 6 }}>Gerçek sığınaklar: habitat{active.havens.some(h => h.id === 'ROVER') ? ' + basınçlı rover' : ''}. Bekleme noktaları (arazi, doz −3…−8 %): {active.havens.filter(h => h.id.startsWith('W')).map(h => `${h.id} (${h.note})`).join(' · ') || 'yok'}.{env.buddy && ` Eş astronot görüş hattı kaybı: %${fmt(active.buddyLosLossPct)}.`}</div>
        </div>
      )}

      <div className="sec">
        <details><summary>Ortam · güneş {fmt(el)}° · görüş {dust.visM > 1e5 ? '>100' : fmt(dust.visM / 1000, 1)} km · güneş gücü ×{fmt(dust.solar, 2)}</summary>
          <Row k="Güneş yüksekliği" v={fmt(el)} unit="°" /><Row k="Görüş (Koschmieder)" v={dust.visM > 1e5 ? '>100' : fmt(dust.visM / 1000, 1)} unit="km" /><Row k="Güneş gücü faktörü" v={fmt(dust.solar, 2)} /><Row k="Mevsim Ls" v={fmt(env.ls)} unit="°" /><Row k="Toz mevsimi" v={env.ls >= 180 ? 'evet (Ls 180–360)' : 'hayır'} />
        </details>
        <details><summary>Karar günlüğü ({result?.explain.length ?? 0} satır · {result ? `${result.timingMs.total} ms` : ''})</summary>
          <div className="log">{result?.explain.map((e, i) => <div key={i}>{e}</div>)}{result && <div>Süre: {Object.entries(result.timingMs).map(([k, v]) => `${k} ${v} ms`).join(' · ')}</div>}</div>
        </details>
        <details><summary>Veri kaynakları ve köken</summary>
          {def.dataTypes.map((d, i) => <div key={i} className="why">• {d}</div>)}
          <div className="why">Köken: {Object.entries(meta.provenance).map(([k, v]) => <span key={k}>{k}<Prov p={v} /> </span>)}</div>
          {meta.rock_anchor && <div className="why">Kaya % ankrajı: arka plan %{(meta.rock_anchor.k_bg * 100).toFixed(1)}, yerel tepe %{(meta.rock_anchor.k_hi * 100).toFixed(0)} <Prov p={meta.id === 'insight' ? 'Observed' : 'Assumed'} /> — yörünge tespitleri görelidir; mutlak ölçek {meta.id === 'insight' ? 'Golombek 2020 yüzey sayımına' : 'iniş bölgesi ölçütlerine (varsayım)'} kalibre.</div>}
        </details>
      </div>

      <div className="sec">
        <h3>Varınca ne göreceğim {pov && <Prov p="Observed" />}</h3>
        {poi ? (
          <div>
            <div style={{ fontWeight: 600 }}>{poi.name}</div>
            <div className="why">{poi.note}<br /><span style={{ color: 'var(--text-3)' }}>Kaynak: {poi.source}</span></div>
            {pov ? (
              <div className="pov">
                <div className="why">Perseverance bu noktanın {pov.waypoint ? `${Math.hypot((pov.waypoint.x - poi.x) * meta.cell_dx, (pov.waypoint.y - poi.y) * meta.cell_dy).toFixed(0)} m` : '?'} yakınından geçti (sol {pov.sol}, site {pov.site}/drive {pov.drive}). Navcam ham görüntüleri:</div>
                {pov.images.map(im => <div key={im.id}><img src={im.file} alt={im.id} loading="lazy" /><small>azimut {im.az.toFixed(0)}° · yükseklik {im.el.toFixed(0)}° · {im.lmst ?? ''} · {pov.credit}</small></div>)}
              </div>
            ) : <div className="why">Bu hedef için rover görüntüsü yok.</div>}
          </div>
        ) : <div className="why">Haritada bir hedefe tıklayın: Perseverance'ın o noktadan çektiği gerçek Navcam görüntüleri burada açılır.</div>}
        <details style={{ marginTop: 6 }}><summary>Genel referans görüntüleri</summary><div className="pov">{def.povImages.map((im, i) => <div key={i}><img src={im.src} alt={im.title} loading="lazy" /><small><b>{im.title}</b> — {im.credit}. {im.note}</small></div>)}</div></details>
      </div>
    </div>
  );
}
