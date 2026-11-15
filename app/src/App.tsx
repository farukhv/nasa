import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './styles/tokens.css';
import { usePlanner } from './usePlanner';
import { buildScenes, gridToLonLat, type SceneDef } from './scenes';
import { DEFAULT_CONFIG, type PlannerConfig } from './engine/config';
import type { EnvState, PlanResult, POI, RouteResult } from './engine/types';
import { marsClock } from './engine/physio';
import MapView, { ROUTE_COL, type LayerId, type RoverData } from './ui/MapView';
import LeftRail from './ui/LeftRail';
import RightPanel, { type RoverPov } from './ui/RightPanel';
import ProfileStrip from './ui/ProfileStrip';
import HudMode from './ui/HudMode';
import PrintSheet from './ui/PrintSheet';
import { Verdict, fmt } from './ui/bits';

const SCENES = [{ id: 'jezero', name: 'Jezero · Three Forks' }, { id: 'insight', name: 'Elysium · InSight' }];
const PRIMARY: { id: LayerId; name: string }[] = [{ id: 'none', name: 'Taban' }, { id: 'S', name: 'Güvenlik' }, { id: 'V', name: 'Bilim' }, { id: 'CLS', name: 'Arazi' }];
const MORE: { id: LayerId; name: string }[] = [{ id: 'C', name: 'Güven C' }, { id: 'K', name: 'Kaya %' }, { id: 'E', name: 'Eğim' }, { id: 'H', name: 'Mineral (CRISM)' }, { id: 'shade', name: 'Gölge' }, { id: 'comm', name: 'İletişim (LOS)' }];
const NOMINAL: Pick<EnvState, 'sep' | 'injured' | 'suitLeak' | 'roverLost' | 'imuOnly'> = { sep: false, injured: false, suitLeak: false, roverLost: false, imuOnly: false };
export type Tool = 'pan' | 'poi' | 'base' | 'rover';

export default function App() {
  const planner = usePlanner();
  const [sceneId, setSceneId] = useState('jezero');
  const [def, setDef] = useState<SceneDef | null>(null);
  const [cfg, setCfg] = useState<PlannerConfig>(() => structuredClone(DEFAULT_CONFIG));
  const [env, setEnv] = useState<EnvState>({ ltst: 10.5, tau: 0.5, airTempC: null, sampleKg: 0, elapsedH: 0, ls: 180, buddy: true, ...NOMINAL });
  const [budgets, setBudgets] = useState({ o2: 0.72, water: 3.9, minutes: 420 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [userPois, setUserPois] = useState<POI[]>([]);
  const [base, setBase] = useState({ x: 0, y: 0 });
  const [rover, setRover] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<'explore' | 'rtb'>('explore');
  const [activeId, setActiveId] = useState<'A' | 'B'>('A');
  const [layer, setLayer] = useState<LayerId>('none');
  const [showCorridor, setShowCorridor] = useState(true);
  const [showHavens, setShowHavens] = useState(true);
  const [showRover, setShowRover] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [tool, setTool] = useState<Tool>('pan');
  const [hud, setHud] = useState(false);
  const [roverTrack, setRoverTrack] = useState<RoverData | null>(null);
  const [roverPov, setRoverPov] = useState<RoverPov | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);            // EVA progress 0..1 along the nominal route
  const [baseline, setBaseline] = useState<PlanResult | null>(null);
  const [clock, setClock] = useState(() => marsClock(new Date(), 77.4));
  const [fitTick, setFitTick] = useState(0);
  const firstPlan = useRef(false);

  useEffect(() => { planner.load(sceneId); firstPlan.current = false; setBaseline(null); setProgress(0); }, [sceneId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRoverTrack(null); setRoverPov(null); setSelectedPoi(null);
    fetch(`/scenes/${sceneId}/rover.json`).then(r => r.ok ? r.json() : null).then(setRoverTrack).catch(() => setRoverTrack(null));
    fetch(`/scenes/${sceneId}/rover_pov.json`).then(r => r.ok ? r.json() : null).then(setRoverPov).catch(() => setRoverPov(null));
  }, [sceneId]);
  useEffect(() => {
    if (!planner.scene) return;
    const d = buildScenes(planner.scene.meta); setDef(d); setBase(d.base); setUserPois([]);
    setRover({ x: d.base.x + 18, y: d.base.y - 6 });
    setSelected(new Set(d.pois.map(p => p.id)));
    setBudgets({ o2: d.defaults.o2Kg, water: d.defaults.waterKg, minutes: d.defaults.maxMinutes });
    setEnv(e => ({ ...e, ltst: d.defaults.ltst, ...NOMINAL }));
  }, [planner.scene]);
  useEffect(() => { const t = setInterval(() => setClock(marsClock(new Date(), def ? (planner.scene!.meta.lon0 + planner.scene!.meta.lon1) / 2 : 77.4)), 1000); return () => clearInterval(t); }, [def, planner.scene]);

  const pois = useMemo(() => [...(def?.pois ?? []), ...userPois], [def, userPois]);
  const W = planner.scene?.meta.W ?? 1;
  const nominal = !env.sep && !env.injured && !env.suitLeak && !env.roverLost && !env.imuOnly && env.tau <= 1 && progress === 0;

  // current position along the nominal (baseline) route A
  const current = useMemo(() => {
    const A = baseline?.routes.find(r => r.id === 'A'); if (!A || progress <= 0) return null;
    const i = Math.min(A.points.length - 1, Math.round(progress * (A.points.length - 1)));
    let acc = 0; const visited: string[] = [];
    for (const lg of A.legs) { acc += lg.distM; if (acc <= A.points[i].distM + 0.5 && lg.to !== 'BASE') visited.push(lg.to); }
    return { pt: A.points[i], visited, i };
  }, [baseline, progress]);

  useEffect(() => {
    if (!planner.scene || !def || !rover || def.id !== planner.scene.meta.id) return; // never plan a scene with another scene's targets
    const t = setTimeout(() => {
      const targets = pois.filter(p => selected.has(p.id) && !(current?.visited.includes(p.id)));
      planner.plan(cfg, {
        baseIdx: Math.round(base.y) * W + Math.round(base.x), roverIdx: Math.round(rover.y) * W + Math.round(rover.x),
        startIdx: current ? current.pt.idx : undefined, o2UsedKg: current?.pt.o2Kg ?? 0, minutesUsed: current?.pt.tMin ?? 0,
        targets, o2BudgetKg: budgets.o2, waterBudgetKg: budgets.water, maxMinutes: budgets.minutes, env, mode, wantPlanB: true,
      }, pois);
    }, firstPlan.current ? 350 : 0);
    firstPlan.current = true;
    return () => clearTimeout(t);
  }, [planner.scene, def, cfg, env, budgets, selected, pois, base, rover, mode, current]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (planner.result && nominal) setBaseline(planner.result); }, [planner.result, nominal]);

  const result = planner.result;
  const active: RouteResult | null = result?.routes.find(r => r.id === activeId) ?? result?.routes[0] ?? null;
  const baseA = baseline?.routes.find(r => r.id === 'A') ?? null;
  const verdict = useMemo(() => {
    if (!active && env.sep && result && result.shelterCountdownMin === 0) return { level: 'go' as const, text: 'SIĞINAKTA', reason: 'Astronot zaten habitat/roverda: EVA başlatma, SEP geçene kadar bekle.' };
    if (!active) return { level: 'idle' as const, text: planner.busy ? 'HESAPLANIYOR' : 'ROTA YOK', reason: '' };
    if (env.sep) return { level: (result?.shelterCountdownMin ?? 99) > cfg.haven.maxMinutes ? 'nogo' as const : 'caution' as const, text: 'SIĞINAĞA DÖN', reason: `SEP: en yakın gerçek sığınağa ${fmt(result?.shelterCountdownMin ?? NaN)} dk` };
    if (active.pointOfNoReturn !== null || active.score.S <= 0) return { level: 'nogo' as const, text: 'NO-GO', reason: active.warnings[0] ?? 'Rota güvenli değil' };
    if (active.warnings.length || active.score.S < 60) return { level: 'caution' as const, text: 'CAUTION', reason: active.warnings[0] ?? `S_rota ${fmt(active.score.S)} < 60` };
    return { level: 'go' as const, text: 'GO', reason: `Min marj +${fmt(active.minMargin.kg, 3)} kg (${fmt(active.minMargin.min)} dk) · en düşük S ${fmt(active.score.Smin)} · sığınağa ≤ ${fmt(active.maxTimeToShelterMin)} dk` };
  }, [active, planner.busy, env.sep, result, cfg.haven.maxMinutes]);

  const addPoi = (x: number, y: number) => { const id = `U${userPois.length + 1}`; setUserPois(u => [...u, { id, name: `Kullanıcı hedefi ${u.length + 1}`, x, y, kind: 'user', value: 40, dwellMin: 10, sampleKg: 0.5, note: 'Haritadan eklenen hedef', source: 'Kullanıcı' }]); setSelected(s => new Set([...s, id])); setTool('pan'); };
  const removePoi = (id: string) => { setUserPois(u => u.filter(p => p.id !== id)); setSelected(s => { const n = new Set(s); n.delete(id); return n; }); };
  const scenarios: string[] = [];
  if (env.sep) scenarios.push('☢ SEP aktif: keşif iptal, sığınağa dön');
  if (env.suitLeak) scenarios.push('Giysi O₂ sızıntısı ×3');
  if (env.injured) scenarios.push('Eş yaralı: hız ×0.5');
  if (env.roverLost) scenarios.push('Rover kullanılamıyor');
  if (env.imuOnly) scenarios.push('UWB kaybı: yalnız IMU');
  if (env.tau > 1) scenarios.push(`Toz τ=${env.tau.toFixed(1)}`);
  if (progress > 0) scenarios.push(`EVA ilerlemesi %${Math.round(progress * 100)}: ${current ? `mevcut konumdan (${fmt(current.pt.distM)} m, ${current.visited.length} hedef tamam) yeniden plan` : 'nominal plan yok, üsten plan'}`);

  // keyboard demo mode
  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (k === '1') { setEnv(v => ({ ...v, ...NOMINAL, tau: 0.5 })); setProgress(0); setMode('explore'); }
    else if (k === '2') setEnv(v => ({ ...v, sep: !v.sep }));
    else if (k === '3') setEnv(v => ({ ...v, suitLeak: !v.suitLeak }));
    else if (k === '4') setEnv(v => ({ ...v, injured: !v.injured }));
    else if (k === '5') setProgress(p => p > 0 ? 0 : 0.45);
    else if (k === '6') setSceneId(s => s === 'jezero' ? 'insight' : 'jezero');
    else if (k === 'b') setActiveId(a => a === 'A' ? 'B' : 'A');
    else if (k === 'h') setHud(h => !h);
    else if (k === 'f') setFitTick(t => t + 1);
    else if (k === 'l') setLayer(l => l === 'none' ? 'S' : l === 'S' ? 'V' : l === 'V' ? 'CLS' : 'none');
    else if (k === 'p') window.print();
  }, []);
  useEffect(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onKey]);

  const legend = useMemo(() => {
    const emg = env.sep || env.tau > 3;
    const base = [<span key="a"><i className="ln" style={{ background: ROUTE_COL.A }} />Ana rota (A)</span>, <span key="a2"><i className="ln" style={{ background: `linear-gradient(90deg, ${ROUTE_COL.warn} 50%, ${ROUTE_COL.risk} 50%)` }} />A üzerinde dikkat / riskli kesim</span>, <span key="b"><i className="ln" style={{ background: `repeating-linear-gradient(90deg, ${ROUTE_COL.B} 0 7px, #26201C 7px 11px)` }} />B planı (kesikli)</span>, <span key="v"><i style={{ background: 'repeating-linear-gradient(45deg,var(--nogo) 0 2px,transparent 2px 5px)', border: '1px solid var(--nogo)' }} />veto</span>, <span key="p"><i style={{ background: '#4C9BFF', borderRadius: '50%' }} />bilimsel hedef</span>, <span key="pv"><i style={{ background: 'rgba(76,155,255,.5)' }} />bilimsel değeri yüksek alan</span>, <span key="s"><i style={{ background: emg ? 'var(--abort)' : 'var(--comms)' }} />{emg ? 'SAKLANILACAK YER (sığınak)' : 'sığınak'}</span>, <span key="w"><i style={{ background: emg ? 'var(--abort)' : 'transparent', border: emg ? '2px solid var(--abort)' : '2px solid var(--safe)', width: 8, height: 8 }} />{emg ? 'bekleme noktası (acil)' : 'bekleme'}</span>];
    if (layer === 'S') base.unshift(<span key="s1"><i style={{ background: 'var(--safe)', borderRadius: '50%' }} />GO ≥70</span>, <span key="s2"><i style={{ background: 'var(--caution)', clipPath: 'polygon(50% 0,100% 100%,0 100%)' }} />50–70</span>, <span key="s3"><i style={{ background: 'var(--nogo)' }} />&lt;50</span>);
    if (layer === 'CLS') base.unshift(<span key="c1"><i style={{ background: '#E8E2D6' }} />anakaya</span>, <span key="c2"><i style={{ background: '#6FA3D8' }} />kayalık</span>, <span key="c3"><i style={{ background: '#5FE3B0' }} />kum dalgası</span>, <span key="c4"><i style={{ background: '#FF4FA8' }} />krater kenarı</span>);
    if (layer === 'V') base.unshift(<span key="v1"><i style={{ background: 'linear-gradient(90deg,#00204D,#FFEA46)' }} />bilim değeri</span>);
    if (roverTrack && showRover) base.push(<span key="r"><i className="ln" style={{ background: `repeating-linear-gradient(90deg, ${ROUTE_COL.rover} 0 4px, #26201C 4px 8px)` }} />Perseverance izi</span>);
    return base;
  }, [layer, roverTrack, showRover, env.sep, env.tau]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="wordmark"><b>Martian Map</b><span>EVA rota ve karar desteği</span></div>
        <div className="seg">{SCENES.map(s => <button key={s.id} className={sceneId === s.id ? 'on' : ''} onClick={() => setSceneId(s.id)}>{s.name}</button>)}</div>
        <div style={{ flex: 1 }} />
        <span className="mono" style={{ color: 'var(--text-2)', fontSize: 12 }} title="Mars24 (Allison & McEwen 2000); Dünya–Mars ışık süresi dairesel yörünge yaklaşımı">MSD {clock.sol} · LMST {Math.floor(clock.lmst)}:{String(Math.floor((clock.lmst % 1) * 60)).padStart(2, '0')} · Dünya gecikmesi {clock.lightMin.toFixed(1)} dk</span>
        <Verdict level={verdict.level} text={verdict.text} />
        <button className="btn" disabled={!active} onClick={() => setHud(true)}>Kask HUD</button>
      </div>

      {planner.scene && def ? (
        <LeftRail def={def} pois={pois} selected={selected} setSelected={setSelected} result={result} activeId={activeId}
          env={env} setEnv={setEnv} cfg={cfg} setCfg={setCfg} budgets={budgets} setBudgets={setBudgets} mode={mode} setMode={setMode}
          tool={tool} setTool={setTool} removePoi={removePoi} busy={planner.busy} onReplan={() => setCfg(c => ({ ...c }))} progress={progress} setProgress={setProgress} />
      ) : <div className="rail" />}

      <div className="mapwrap">
        <div className="layers">
          <div className="seg">{PRIMARY.map(l => <button key={l.id} className={layer === l.id ? 'on' : ''} onClick={() => setLayer(l.id)}>{l.name}</button>)}</div>
          <select value={MORE.some(m => m.id === layer) ? layer : ''} onChange={e => e.target.value && setLayer(e.target.value as LayerId)}><option value="">Diğer katman ▾</option>{MORE.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <div className="tg">
            <button className={showCorridor ? 'on' : ''} onClick={() => setShowCorridor(v => !v)}>Koridor</button>
            <button className={showHavens ? 'on' : ''} onClick={() => setShowHavens(v => !v)}>Sığınak</button>
            {roverTrack && <button className={showRover ? 'on' : ''} onClick={() => setShowRover(v => !v)}>Rover izi</button>}
          </div>
        </div>
        {scenarios.length > 0 && <div className={`banner ${env.sep ? 'nogo' : ''}`}>{scenarios.join(' · ')}<button title="Senaryoları sıfırla" onClick={() => { setEnv(v => ({ ...v, ...NOMINAL, tau: 0.5 })); setProgress(0); }}>×</button></div>}
        <div className="demohint">1 nominal · 2 SEP · 3 sızıntı · 4 yaralı · 5 ilerle · 6 sahne · B rota · L katman · H HUD · F sığdır · P yazdır</div>
        {planner.scene && def && <MapView scene={planner.scene} def={def} result={result} active={active} ghost={!nominal ? baseA : null} layer={layer} pois={pois} base={base} rover={rover}
          hover={hover} setHover={setHover} tool={tool} onAddPoi={addPoi} onSetBase={(x, y) => { setBase({ x, y }); setTool('pan'); }} onSetRover={(x, y) => { setRover({ x, y }); setTool('pan'); }}
          showCorridor={showCorridor} showHavens={showHavens} currentPt={current?.pt ?? null} roverTrack={roverTrack} showRover={showRover} selectedPoi={selectedPoi} onSelectPoi={setSelectedPoi} fitTick={fitTick}
          toLonLat={(x, y) => gridToLonLat(planner.scene!.meta, x, y)} emergency={env.sep || env.tau > 3} />}
        <div className="legend">{legend}</div>
        {(!planner.scene || planner.busy) && <div className="overlaymsg"><div style={{ textAlign: 'center' }}>{planner.scene ? 'Rota motoru çalışıyor' : `Sahne yükleniyor %${Math.round(planner.progress * 100)}`}<div className="progress"><i style={{ width: `${planner.scene ? 100 : planner.progress * 100}%` }} /></div></div></div>}
        {planner.error && <div className="overlaymsg bad">Hata: {planner.error}</div>}
      </div>

      {planner.scene && def && <RightPanel def={def} meta={planner.scene.meta} result={result} baseline={baseline} active={active} activeId={activeId} setActiveId={setActiveId} cfg={cfg} budgets={budgets} env={env} selectedPoi={selectedPoi} roverPov={roverPov} verdict={verdict} />}
      <div className="strip"><ProfileStrip route={active} hover={hover} setHover={setHover} cfg={cfg} o2Budget={budgets.o2} /></div>
      {hud && active && planner.scene && <HudMode route={active} cfg={cfg} o2Budget={budgets.o2} onExit={() => setHud(false)} sceneW={planner.scene.meta.W} sceneH={planner.scene.meta.H} shelterCountdown={result?.shelterCountdownMin ?? null} sep={env.sep} pov={roverPov} />}
      {def && <PrintSheet def={def} active={active} cfg={cfg} budgets={budgets} verdict={verdict} />}
    </div>
  );
}
