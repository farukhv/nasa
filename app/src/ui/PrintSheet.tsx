import type { RouteResult } from '../engine/types';
import type { PlannerConfig } from '../engine/config';
import type { SceneDef } from '../scenes';
import { fmt } from './bits';

/** Apollo-style cuff checklist: printed with Ctrl+P / key P. Hidden on screen. */
export default function PrintSheet({ def, active, cfg, budgets, verdict }: { def: SceneDef; active: RouteResult | null; cfg: PlannerConfig; budgets: { o2: number; water: number; minutes: number }; verdict: { text: string; reason: string } }) {
  return (
    <div className="printonly">
      <h1>EVA CUFF CHECKLIST — {def.title}</h1>
      <p>{def.region} · Karar: <b>{verdict.text}</b> — {verdict.reason}</p>
      {active ? (
        <>
          <table><thead><tr><th>#</th><th>Bacak</th><th>m</th><th>dk</th><th>O₂ kg</th><th>Kümülatif dk</th></tr></thead>
            <tbody>{(() => { let acc = 0; return active.legs.map((l, i) => { acc += l.tMin; return <tr key={i}><td>{i + 1}</td><td>{l.from === 'START' ? 'Başlangıç' : l.from === 'BASE' ? 'Habitat' : l.from} → {l.to === 'BASE' ? 'Habitat' : l.to}</td><td>{fmt(l.distM)}</td><td>{fmt(l.tMin)}</td><td>{fmt(l.o2Kg, 3)}</td><td>{fmt(acc)}</td></tr>; }); })()}</tbody></table>
          <h2>Kurallar</h2>
          <ol>
            <li>Walk-back: O₂ kalan ≥ {cfg.o2.reserveFactor}× dönüş O₂'si. Min marj {fmt(active.minMargin.kg, 3)} kg ({fmt(active.minMargin.min)} dk) {fmt(active.minMargin.atM)} m'de.</li>
            <li>Dönüşü olmayan nokta: {active.pointOfNoReturn !== null ? `${fmt(active.points[active.pointOfNoReturn].distM)} m — BU NOKTAYI GEÇME` : 'yok'}.</li>
            <li>Sığınaklar: habitat{active.havens.some(h => h.id === 'ROVER') ? ', rover' : ''}; bekleme noktaları {active.havens.filter(h => h.id.startsWith('W')).map(h => h.id).join(', ') || 'yok'}. Sığınağa en uzak {fmt(active.maxTimeToShelterMin)} dk.</li>
            <li>SEP uyarısı: bilim iptal, en yakın habitat/rovera dön. Toz τ&gt;3: hız düşür, görüş kontrol.</li>
            <li>Bütçeler: O₂ {budgets.o2} kg · su {budgets.water} kg · süre {budgets.minutes} dk. Numune tavanı {cfg.o2.maxSampleKg} kg.</li>
            <li>Eğim &gt; {cfg.veto.E}° ve kaya &gt; %{cfg.veto.K} hücreleri yasak; 15–25° arası dikkat.</li>
          </ol>
          <h2>Neden bu rota</h2><ul>{active.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </>
      ) : <p>Rota yok.</p>}
      <p style={{ fontSize: 10 }}>Martian Map · NASA Space Apps 2026 · veri: {def.dataTypes.join('; ')}</p>
    </div>
  );
}
