import type { Dispatch, SetStateAction } from 'react';
import type { EnvState, PlanResult, POI } from '../engine/types';
import type { Tool } from '../App';
import { TERRAIN_CLASSES, WHY, type PlannerConfig } from '../engine/config';
import type { SceneDef } from '../scenes';
import { Row, Slider, Toggle, Prov } from './bits';

interface Props {
  def: SceneDef; pois: POI[]; selected: Set<string>; setSelected: Dispatch<SetStateAction<Set<string>>>;
  result: PlanResult | null; activeId: 'A' | 'B';
  env: EnvState; setEnv: Dispatch<SetStateAction<EnvState>>;
  cfg: PlannerConfig; setCfg: Dispatch<SetStateAction<PlannerConfig>>;
  budgets: { o2: number; water: number; minutes: number }; setBudgets: Dispatch<SetStateAction<{ o2: number; water: number; minutes: number }>>;
  mode: 'explore' | 'rtb'; setMode: (m: 'explore' | 'rtb') => void;
  tool: Tool; setTool: (t: Tool) => void; progress: number; setProgress: (v: number) => void;
  removePoi: (id: string) => void; busy: boolean; onReplan: () => void;
}

export default function LeftRail(p: Props) {
  return (
    <div className="rail">
      <div className="sec">
        <h3>Görev hedefleri <span className="seg"><button className={p.tool === 'pan' ? 'on' : ''} onClick={() => p.setTool('pan')}>Gez</button><button className={p.tool === 'poi' ? 'on' : ''} onClick={() => p.setTool('poi')}>+ Hedef</button><button className={p.tool === 'base' ? 'on' : ''} onClick={() => p.setTool('base')}>Habitat</button><button className={p.tool === 'rover' ? 'on' : ''} onClick={() => p.setTool('rover')}>Rover</button></span></h3>
        {p.pois.map(poi => {
          const k = p.result?.routes.find(r => r.id === p.activeId)?.order.indexOf(poi.id) ?? -1;
          const skipped = p.result?.skipped.find(s => s.id === poi.id);
          return (
            <div key={poi.id} className={`poi ${poi.kind}`}>
              <input type="checkbox" checked={p.selected.has(poi.id)} onChange={e => p.setSelected(s => { const n = new Set(s); if (e.target.checked) n.add(poi.id); else n.delete(poi.id); return n; })} />
              <span className="n">{k >= 0 ? k + 1 : '·'}</span>
              <span>{poi.name}<small>V {poi.value} · {poi.dwellMin ?? 15} dk · {poi.sampleKg ?? 0} kg{skipped && <span className="bad"> · atlandı: {skipped.reason}</span>}</small></span>
              {poi.kind === 'user' ? <button className="btn sm" onClick={() => p.removePoi(poi.id)}>×</button> : <span />}
            </div>
          );
        })}
        <div className="why" style={{ marginTop: 6 }}>Sıralama: ödüllü gezgin satıcı (bitmask DP) — O₂ bütçesinin 1/1.2'si içinde güven-ağırlıklı bilim en yüksek olacak şekilde.</div>
      </div>

      <div className="sec">
        <h3>Mod <span><button className="btn sm primary" disabled={p.busy} onClick={p.onReplan}>{p.busy ? 'Hesaplanıyor…' : 'Yeniden planla'}</button></span></h3>
        <div className="seg"><button className={p.mode === 'explore' ? 'on' : ''} onClick={() => p.setMode('explore')}>Keşif</button><button className={p.mode === 'rtb' ? 'on' : ''} onClick={() => p.setMode('rtb')}>Acil dönüş (RTB)</button></div>
        <Slider label="EVA ilerlemesi (mevcut konumdan yeniden plan)" v={p.progress} set={p.setProgress} min={0} max={0.95} step={0.05} fmtv={v => `%${Math.round(v * 100)}`} />
      </div>

      <div className="sec">
        <h3>Senaryolar (what-if)</h3>
        <Slider label="Yerel güneş saati (LTST)" v={p.env.ltst} set={v => p.setEnv(e => ({ ...e, ltst: v }))} min={6} max={18} step={0.25} fmtv={v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`} />
        <Slider label="Mevsim Ls (güneş deklinasyonu, toz mevsimi 180–360)" v={p.env.ls} set={v => p.setEnv(e => ({ ...e, ls: v }))} min={0} max={359} step={1} unit="°" />
        <Toggle label="Eş astronot (60 s geride)" hint="Karşılıklı görüş hattı DEM üzerinden kontrol edilir" on={p.env.buddy} set={v => p.setEnv(e => ({ ...e, buddy: v }))} />
        <Slider label="Toz opaklığı τ" v={p.env.tau} set={v => p.setEnv(e => ({ ...e, tau: v }))} min={0.2} max={10} step={0.1} fmtv={v => v.toFixed(1)} />
        <Toggle label="Güneş parçacık fırtınası (SEP)" hint="Keşif askıya alınır: w_v=0, radyasyon ağırlığı ×3, düşük gökyüzü görüşü ve sığınak önceliği" on={p.env.sep} set={v => p.setEnv(e => ({ ...e, sep: v }))} />
        <Toggle label="Eş yaralandı" hint="Hız ×0.5, çaba ×1.3" on={p.env.injured} set={v => p.setEnv(e => ({ ...e, injured: v }))} />
        <Toggle label="Giysi O₂ sızıntısı" hint="Tüketim ×3" on={p.env.suitLeak} set={v => p.setEnv(e => ({ ...e, suitLeak: v }))} />
        <Toggle label="Rover kullanılamıyor" hint="Rover sığınak olmaktan çıkar" on={p.env.roverLost} set={v => p.setEnv(e => ({ ...e, roverLost: v }))} />
        <Toggle label="İşaret/UWB kaybı (yalnız IMU)" hint="Konum hatası ∝ t² (0.005·t²)" on={p.env.imuOnly} set={v => p.setEnv(e => ({ ...e, imuOnly: v }))} />
        <Slider label="EVA'da geçen süre (yorgunluk)" v={p.env.elapsedH} set={v => p.setEnv(e => ({ ...e, elapsedH: v }))} min={0} max={6} step={0.5} unit="h" />
        <Slider label="Dönüşte taşınan ek numune" v={p.env.sampleKg} set={v => p.setEnv(e => ({ ...e, sampleKg: v }))} min={0} max={20} step={1} unit="kg" />
      </div>

      <div className="sec">
        <h3>Bütçeler</h3>
        <Slider label="Kullanılabilir O₂" v={p.budgets.o2} set={v => p.setBudgets(b => ({ ...b, o2: v }))} min={0.1} max={1.2} step={0.01} unit="kg" fmtv={v => v.toFixed(2)} />
        <Slider label="Soğutma suyu" v={p.budgets.water} set={v => p.setBudgets(b => ({ ...b, water: v }))} min={1} max={5} step={0.1} unit="kg" fmtv={v => v.toFixed(1)} />
        <Slider label="Süre sınırı" v={p.budgets.minutes} set={v => p.setBudgets(b => ({ ...b, minutes: v }))} min={60} max={480} step={10} unit="dk" />
      </div>

      <div className="sec">
        <h3>Ağırlıklar <Prov p="Derived" /></h3>
        <Slider label={`Güvenlik : bilim = ${Math.round(p.cfg.cost.ws * 100)} : ${Math.round(p.cfg.cost.wv * 100)}`} v={p.cfg.cost.ws} set={v => p.setCfg(c => ({ ...c, cost: { ...c.cost, ws: v, wv: 1 - v } }))} min={0.5} max={0.9} step={0.05} fmtv={v => v < 0.7 ? 'bilim öncelik' : 'güvenlik öncelik'} />
        <div className="why">{WHY['cost.ws'].label} — {WHY['cost.ws'].source}</div>
        <details>
          <summary>Hücre güvenlik ağırlıkları (S_i)</summary>
          {(['K', 'E', 'Z', 'R', 'O', 'T'] as const).map(k => (
            <Slider key={k} label={{ K: 'Kaya yoğunluğu', E: 'Eğim', Z: 'Zemin direnci', R: 'Radyasyon', O: 'O₂ dönüş durumu', T: 'Sıcaklık' }[k]} v={p.cfg.safety[k]} set={v => p.setCfg(c => ({ ...c, safety: { ...c.safety, [k]: v } }))} min={0} max={0.5} step={0.05} fmtv={v => v.toFixed(2)} />
          ))}
          <div className="why">Gölge −5, iletişim kopuk −10 (sabit). Veto: eğim&gt;{p.cfg.veto.E}°, kaya&gt;%{p.cfg.veto.K}, zemin&gt;{p.cfg.veto.Z}, R&gt;{p.cfg.veto.R}, T&gt;{p.cfg.veto.T}.</div>
        </details>
        <details>
          <summary>Bilimsel değer ağırlıkları (V_i)</summary>
          {(['G', 'DK', 'F', 'N', 'H'] as const).map(k => (
            <Slider key={k} label={{ G: 'Jeolojik maruziyet', DK: 'Kaya/ton çeşitliliği', F: 'Taze yüzey/kesit', N: 'Hedef yakınlığı (yenilik)', H: 'Hidrasyon / mineral' }[k]} v={p.cfg.science[k]} set={v => p.setCfg(c => ({ ...c, science: { ...c.science, [k]: v } }))} min={0} max={0.5} step={0.05} fmtv={v => v.toFixed(2)} />
          ))}
        </details>
        <details>
          <summary>Fizyoloji katsayıları</summary>
          <Row k="O₂ taban" v={p.cfg.o2.baseKgPerKm} unit="kg/km" /><div className="why">{WHY['o2.baseKgPerKm'].source}</div>
          <Row k="Yokuş katsayısı" v={`1 + ${p.cfg.o2.alphaUp}·tanθ`} /><div className="why">{WHY['o2.alphaUp'].source}</div>
          <Row k="Numune γ" v={p.cfg.o2.gammaPerKg} unit="/kg" /><div className="why">{WHY['o2.gammaPerKg'].source}</div>
          <Row k="Soğutma suyu" v={p.cfg.water.kgPerHPerW} unit="kg/h/W" /><div className="why">{WHY['water.kgPerHPerW'].source}</div>
          <Row k="Konum belirsizliği" v={`${p.cfg.nav.pdrFrac * 100}% · d`} /><div className="why">{WHY['nav.pdrFrac'].source}</div>
        </details>
        <details>
          <summary>Arazi sınıfı tablosu (ceza / bilim)</summary>
          {TERRAIN_CLASSES.map(t => <div key={t.id}><Row k={t.name} v={`${t.penalty} / ${t.science}`} /><div className="why">{t.why}</div></div>)}
        </details>
      </div>
    </div>
  );
}
