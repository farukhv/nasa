import type { Dispatch, SetStateAction } from 'react';
import type { EnvState, PlanResult, POI } from '../engine/types';
import type { Tool } from '../App';
import { TERRAIN_CLASSES, WHY, type PlannerConfig } from '../engine/config';
import type { SceneDef } from '../scenes';
import { useI18n } from '../i18n';
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
  const { t, lang } = useI18n();
  const r = t.rail, min = t.u.min;
  return (
    <div className="rail">
      <div className="sec" data-tour="targets">
        <h3>{r.targets} <span className="seg"><button className={p.tool === 'pan' ? 'on' : ''} onClick={() => p.setTool('pan')}>{r.toolPan}</button><button className={p.tool === 'poi' ? 'on' : ''} onClick={() => p.setTool('poi')}>{r.toolTarget}</button><button className={p.tool === 'base' ? 'on' : ''} onClick={() => p.setTool('base')}>{r.toolHabitat}</button><button className={p.tool === 'rover' ? 'on' : ''} onClick={() => p.setTool('rover')}>{r.toolRover}</button></span></h3>
        {p.pois.map(poi => {
          const k = p.result?.routes.find(q => q.id === p.activeId)?.order.indexOf(poi.id) ?? -1;
          const skipped = p.result?.skipped.find(s => s.id === poi.id);
          return (
            <div key={poi.id} className={`poi ${poi.kind}`}>
              <input type="checkbox" checked={p.selected.has(poi.id)} onChange={e => p.setSelected(s => { const n = new Set(s); if (e.target.checked) n.add(poi.id); else n.delete(poi.id); return n; })} />
              <span className="n">{k >= 0 ? k + 1 : '·'}</span>
              <span>{poi.name}<small>V {poi.value} · {poi.dwellMin ?? 15} {min} · {poi.sampleKg ?? 0} kg{skipped && <span className="bad"> · {r.skipped}: {skipped.reason}</span>}</small></span>
              {poi.kind === 'user' ? <button className="btn sm" onClick={() => p.removePoi(poi.id)}>×</button> : <span />}
            </div>
          );
        })}
        <div className="why" style={{ marginTop: 6 }}>{r.orderingNote}</div>
      </div>

      <div className="sec">
        <h3>{r.mode} <span><button className="btn sm primary" disabled={p.busy} onClick={p.onReplan}>{p.busy ? r.computing : r.replan}</button></span></h3>
        <div className="seg"><button className={p.mode === 'explore' ? 'on' : ''} onClick={() => p.setMode('explore')}>{r.explore}</button><button className={p.mode === 'rtb' ? 'on' : ''} onClick={() => p.setMode('rtb')}>{r.rtb}</button></div>
        <Slider label={r.progress} v={p.progress} set={p.setProgress} min={0} max={0.95} step={0.05} fmtv={v => t.u.pct(Math.round(v * 100))} />
      </div>

      <div className="sec" data-tour="scenarios">
        <h3>{r.scenarios}</h3>
        <Slider label={r.ltst} v={p.env.ltst} set={v => p.setEnv(e => ({ ...e, ltst: v }))} min={6} max={18} step={0.25} fmtv={v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`} />
        <Slider label={r.ls} v={p.env.ls} set={v => p.setEnv(e => ({ ...e, ls: v }))} min={0} max={359} step={1} unit="°" />
        <Toggle label={r.buddy} hint={r.buddyHint} on={p.env.buddy} set={v => p.setEnv(e => ({ ...e, buddy: v }))} />
        <Slider label={r.tau} v={p.env.tau} set={v => p.setEnv(e => ({ ...e, tau: v }))} min={0.2} max={10} step={0.1} fmtv={v => v.toFixed(1)} />
        <Toggle label={r.sep} hint={r.sepHint} on={p.env.sep} set={v => p.setEnv(e => ({ ...e, sep: v }))} />
        <Toggle label={r.injured} hint={r.injuredHint} on={p.env.injured} set={v => p.setEnv(e => ({ ...e, injured: v }))} />
        <Toggle label={r.leak} hint={r.leakHint} on={p.env.suitLeak} set={v => p.setEnv(e => ({ ...e, suitLeak: v }))} />
        <Toggle label={r.roverLost} hint={r.roverLostHint} on={p.env.roverLost} set={v => p.setEnv(e => ({ ...e, roverLost: v }))} />
        <Toggle label={r.imu} hint={r.imuHint} on={p.env.imuOnly} set={v => p.setEnv(e => ({ ...e, imuOnly: v }))} />
        <Slider label={r.elapsed} v={p.env.elapsedH} set={v => p.setEnv(e => ({ ...e, elapsedH: v }))} min={0} max={6} step={0.5} unit="h" />
        <Slider label={r.sample} v={p.env.sampleKg} set={v => p.setEnv(e => ({ ...e, sampleKg: v }))} min={0} max={20} step={1} unit="kg" />
      </div>

      <div className="sec">
        <h3>{r.budgets}</h3>
        <Slider label={r.o2} v={p.budgets.o2} set={v => p.setBudgets(b => ({ ...b, o2: v }))} min={0.1} max={1.2} step={0.01} unit="kg" fmtv={v => v.toFixed(2)} />
        <Slider label={r.water} v={p.budgets.water} set={v => p.setBudgets(b => ({ ...b, water: v }))} min={1} max={5} step={0.1} unit="kg" fmtv={v => v.toFixed(1)} />
        <Slider label={r.timeLimit} v={p.budgets.minutes} set={v => p.setBudgets(b => ({ ...b, minutes: v }))} min={60} max={480} step={10} unit={min} />
      </div>

      <div className="sec">
        <h3>{r.weights} <Prov p="Derived" /></h3>
        <Slider label={r.ratio(Math.round(p.cfg.cost.ws * 100), Math.round(p.cfg.cost.wv * 100))} v={p.cfg.cost.ws} set={v => p.setCfg(c => ({ ...c, cost: { ...c.cost, ws: v, wv: 1 - v } }))} min={0.5} max={0.9} step={0.05} fmtv={v => v < 0.7 ? r.scienceFirst : r.safetyFirst} />
        <div className="why">{WHY['cost.ws'].label[lang]} — {WHY['cost.ws'].source[lang]}</div>
        <details>
          <summary>{r.cellSafety}</summary>
          {(['K', 'E', 'Z', 'R', 'O', 'T'] as const).map(k => (
            <Slider key={k} label={r.safetyTerms[k]} v={p.cfg.safety[k]} set={v => p.setCfg(c => ({ ...c, safety: { ...c.safety, [k]: v } }))} min={0} max={0.5} step={0.05} fmtv={v => v.toFixed(2)} />
          ))}
          <div className="why">{r.fixedNote(p.cfg.veto)}</div>
        </details>
        <details>
          <summary>{r.cellScience}</summary>
          {(['G', 'DK', 'F', 'N', 'H'] as const).map(k => (
            <Slider key={k} label={r.scienceTerms[k]} v={p.cfg.science[k]} set={v => p.setCfg(c => ({ ...c, science: { ...c.science, [k]: v } }))} min={0} max={0.5} step={0.05} fmtv={v => v.toFixed(2)} />
          ))}
        </details>
        <details>
          <summary>{r.physiology}</summary>
          <Row k={r.o2Base} v={p.cfg.o2.baseKgPerKm} unit="kg/km" /><div className="why">{WHY['o2.baseKgPerKm'].source[lang]}</div>
          <Row k={r.uphill} v={`1 + ${p.cfg.o2.alphaUp}·tanθ`} /><div className="why">{WHY['o2.alphaUp'].source[lang]}</div>
          <Row k={r.sampleGamma} v={p.cfg.o2.gammaPerKg} unit="/kg" /><div className="why">{WHY['o2.gammaPerKg'].source[lang]}</div>
          <Row k={r.coolingWater} v={p.cfg.water.kgPerHPerW} unit="kg/h/W" /><div className="why">{WHY['water.kgPerHPerW'].source[lang]}</div>
          <Row k={r.positionUncertainty} v={`${p.cfg.nav.pdrFrac * 100}% · d`} /><div className="why">{WHY['nav.pdrFrac'].source[lang]}</div>
        </details>
        <details>
          <summary>{r.terrainTable}</summary>
          {TERRAIN_CLASSES.map(c => <div key={c.id}><Row k={c.name[lang]} v={`${c.penalty} / ${c.science}`} /><div className="why">{c.why[lang]}</div></div>)}
        </details>
      </div>
    </div>
  );
}
