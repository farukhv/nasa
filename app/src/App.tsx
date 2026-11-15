import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './styles/tokens.css';
import { usePlanner } from './usePlanner';
import { buildScenes, gridToLonLat } from './scenes';
import { DEFAULT_CONFIG, type PlannerConfig } from './engine/config';
import type { EnvState, PlanResult, POI, RouteResult } from './engine/types';
import { marsClock } from './engine/physio';
import { DICTIONARIES, LANGUAGES, LanguageContext, initialLanguage, rememberLanguage, type Lang } from './i18n';
import MapView, { ROUTE_COL, type LayerId, type RoverData } from './ui/MapView';
import LeftRail from './ui/LeftRail';
import RightPanel, { type RoverPov } from './ui/RightPanel';
import ProfileStrip from './ui/ProfileStrip';
import HudMode from './ui/HudMode';
import PrintSheet from './ui/PrintSheet';
import Tour from './ui/Tour';
import { Verdict, fmt } from './ui/bits';

const SCENES = [{ id: 'jezero', name: 'Jezero · Three Forks' }, { id: 'insight', name: 'Elysium · InSight' }];
const PRIMARY: LayerId[] = ['none', 'S', 'V', 'CLS'];
const MORE: LayerId[] = ['C', 'K', 'E', 'H', 'shade', 'comm'];
const NOMINAL: Pick<EnvState, 'sep' | 'injured' | 'suitLeak' | 'roverLost' | 'imuOnly'> = { sep: false, injured: false, suitLeak: false, roverLost: false, imuOnly: false };
const TOUR_KEY = 'mm-tour-done', THEME_KEY = 'mm-theme';
export type Tool = 'pan' | 'poi' | 'base' | 'rover';
type Theme = 'light' | 'dark';

const stored = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const store = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } };

export default function App() {
  const planner = usePlanner();
  const [lang, setLang] = useState<Lang>(initialLanguage);
  const t = DICTIONARIES[lang];
  const [theme, setTheme] = useState<Theme>(() => (stored(THEME_KEY) === 'light' ? 'light' : 'dark'));
  const [tour, setTour] = useState(() => stored(TOUR_KEY) === null);
  const [sceneId, setSceneId] = useState('jezero');
  const [readyId, setReadyId] = useState<string | null>(null);   // scene whose base, targets and budgets are in state
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
  const tourOpen = useRef(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; store(THEME_KEY, theme); }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; document.title = t.app.title; rememberLanguage(lang); }, [lang, t]);

  useEffect(() => { planner.load(sceneId); firstPlan.current = false; setBaseline(null); setProgress(0); }, [sceneId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setRoverTrack(null); setRoverPov(null); setSelectedPoi(null);
    fetch(`/scenes/${sceneId}/rover.json`).then(r => r.ok ? r.json() : null).then(setRoverTrack).catch(() => setRoverTrack(null));
    fetch(`/scenes/${sceneId}/rover_pov.json`).then(r => r.ok ? r.json() : null).then(setRoverPov).catch(() => setRoverPov(null));
  }, [sceneId]);

  // scene text follows the language; positions, budgets and selections are reset only when the scene itself changes
  const def = useMemo(() => (planner.scene ? buildScenes(planner.scene.meta, lang) : null), [planner.scene, lang]);
  useEffect(() => {
    if (!planner.scene) return;
    const d = buildScenes(planner.scene.meta);
    setBase(d.base); setUserPois([]);
    setRover({ x: d.base.x + 18, y: d.base.y - 6 });
    setSelected(new Set(d.pois.map(p => p.id)));
    setBudgets({ o2: d.defaults.o2Kg, water: d.defaults.waterKg, minutes: d.defaults.maxMinutes });
    setEnv(e => ({ ...e, ltst: d.defaults.ltst, ...NOMINAL }));
    setReadyId(d.id);
  }, [planner.scene]);
  useEffect(() => { const id = setInterval(() => setClock(marsClock(new Date(), planner.scene ? (planner.scene.meta.lon0 + planner.scene.meta.lon1) / 2 : 77.4)), 1000); return () => clearInterval(id); }, [planner.scene]);

  const pois = useMemo(() => [...(def?.pois ?? []), ...userPois.map(u => ({ ...u, name: t.app.userTarget(u.id.slice(1)), note: t.app.userTargetNote, source: t.app.userSource }))], [def, userPois, t]);
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
    if (!planner.scene || !def || !rover || readyId !== planner.scene.meta.id) return; // never plan a scene with another scene's targets
    const id = setTimeout(() => {
      const targets = pois.filter(p => selected.has(p.id) && !(current?.visited.includes(p.id)));
      planner.plan(cfg, {
        lang,
        baseIdx: Math.round(base.y) * W + Math.round(base.x), roverIdx: Math.round(rover.y) * W + Math.round(rover.x),
        startIdx: current ? current.pt.idx : undefined, o2UsedKg: current?.pt.o2Kg ?? 0, minutesUsed: current?.pt.tMin ?? 0,
        targets, o2BudgetKg: budgets.o2, waterBudgetKg: budgets.water, maxMinutes: budgets.minutes, env, mode, wantPlanB: true,
      }, pois);
    }, firstPlan.current ? 350 : 0);
    firstPlan.current = true;
    return () => clearTimeout(id);
  }, [planner.scene, readyId, cfg, env, budgets, selected, pois, base, rover, mode, current, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (planner.result && nominal) setBaseline(planner.result); }, [planner.result, nominal]);

  const result = planner.result;
  const active: RouteResult | null = result?.routes.find(r => r.id === activeId) ?? result?.routes[0] ?? null;
  const baseA = baseline?.routes.find(r => r.id === 'A') ?? null;
  const verdict = useMemo(() => {
    const v = t.verdict;
    if (!active && env.sep && result && result.shelterCountdownMin === 0) return { level: 'go' as const, text: v.sheltered, reason: v.shelteredReason };
    if (!active) return { level: 'idle' as const, text: planner.busy ? v.computing : v.noRoute, reason: '' };
    if (env.sep) return { level: (result?.shelterCountdownMin ?? 99) > cfg.haven.maxMinutes ? 'nogo' as const : 'caution' as const, text: v.toShelter, reason: v.sepReason(fmt(result?.shelterCountdownMin ?? NaN)) };
    if (active.pointOfNoReturn !== null || active.score.S <= 0) return { level: 'nogo' as const, text: 'NO-GO', reason: active.warnings[0] ?? v.unsafe };
    if (active.warnings.length || active.score.S < 60) return { level: 'caution' as const, text: 'CAUTION', reason: active.warnings[0] ?? v.lowS(fmt(active.score.S)) };
    return { level: 'go' as const, text: 'GO', reason: v.goReason(fmt(active.minMargin.kg, 3), fmt(active.minMargin.min), fmt(active.score.Smin), fmt(active.maxTimeToShelterMin)) };
  }, [active, planner.busy, env.sep, result, cfg.haven.maxMinutes, t]);

  const addPoi = (x: number, y: number) => {
    const n = userPois.reduce((m, u) => Math.max(m, Number(u.id.slice(1))), 0) + 1, id = `U${n}`;
    setUserPois(u => [...u, { id, name: '', x, y, kind: 'user', value: 40, dwellMin: 10, sampleKg: 0.5 }]);
    setSelected(s => new Set([...s, id])); setTool('pan');
  };
  const removePoi = (id: string) => { setUserPois(u => u.filter(p => p.id !== id)); setSelected(s => { const n = new Set(s); n.delete(id); return n; }); };

  const scenarios: string[] = [];
  if (env.sep) scenarios.push(t.scenario.sep);
  if (env.suitLeak) scenarios.push(t.scenario.leak);
  if (env.injured) scenarios.push(t.scenario.injured);
  if (env.roverLost) scenarios.push(t.scenario.roverLost);
  if (env.imuOnly) scenarios.push(t.scenario.imu);
  if (env.tau > 1) scenarios.push(t.scenario.dust(env.tau.toFixed(1)));
  if (progress > 0) scenarios.push(t.scenario.progress(Math.round(progress * 100), current ? t.scenario.progressAt(fmt(current.pt.distM), current.visited.length) : t.scenario.progressNone));

  const closeTour = useCallback(() => { store(TOUR_KEY, '1'); setTour(false); }, []);
  const tourVisible = tour && !!planner.scene && !!def && !hud;
  useEffect(() => { tourOpen.current = tourVisible; }, [tourVisible]);

  // keyboard demo mode
  const onKey = useCallback((e: KeyboardEvent) => {
    if (tourOpen.current) return;
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
    else if (k === 'f') setFitTick(n => n + 1);
    else if (k === 'l') setLayer(l => l === 'none' ? 'S' : l === 'S' ? 'V' : l === 'V' ? 'CLS' : 'none');
    else if (k === 'p') window.print();
  }, []);
  useEffect(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onKey]);

  const legend = useMemo(() => {
    const g = t.legend, emg = env.sep || env.tau > 3;
    const items = [
      <span key="a"><i className="ln" style={{ background: ROUTE_COL.A }} />{g.routeA}</span>,
      <span key="a2"><i className="ln" style={{ background: `linear-gradient(90deg, ${ROUTE_COL.warn} 50%, ${ROUTE_COL.risk} 50%)` }} />{g.riskOnA}</span>,
      <span key="b"><i className="ln" style={{ background: `repeating-linear-gradient(90deg, ${ROUTE_COL.B} 0 7px, #26201C 7px 11px)` }} />{g.routeB}</span>,
      <span key="v"><i style={{ background: 'repeating-linear-gradient(45deg,var(--nogo) 0 2px,transparent 2px 5px)', border: '1px solid var(--nogo)' }} />{g.veto}</span>,
      <span key="p"><i style={{ background: '#4C9BFF', borderRadius: '50%' }} />{g.sciTarget}</span>,
      <span key="pv"><i style={{ background: 'rgba(76,155,255,.5)' }} />{g.sciArea}</span>,
      <span key="s"><i style={{ background: emg ? 'var(--abort)' : 'var(--comms)' }} />{emg ? g.shelterEmergency : g.shelter}</span>,
      <span key="w"><i style={{ background: emg ? 'var(--abort)' : 'transparent', border: emg ? '2px solid var(--abort)' : '2px solid var(--safe)', width: 8, height: 8 }} />{emg ? g.waitEmergency : g.wait}</span>,
    ];
    if (layer === 'S') items.unshift(<span key="s1"><i style={{ background: 'var(--safe)', borderRadius: '50%' }} />GO ≥70</span>, <span key="s2"><i style={{ background: 'var(--caution)', clipPath: 'polygon(50% 0,100% 100%,0 100%)' }} />50–70</span>, <span key="s3"><i style={{ background: 'var(--nogo)' }} />&lt;50</span>);
    if (layer === 'CLS') items.unshift(<span key="c1"><i style={{ background: '#E8E2D6' }} />{g.bedrock}</span>, <span key="c2"><i style={{ background: '#6FA3D8' }} />{g.rocky}</span>, <span key="c3"><i style={{ background: '#5FE3B0' }} />{g.ripple}</span>, <span key="c4"><i style={{ background: '#FF4FA8' }} />{g.rim}</span>);
    if (layer === 'V') items.unshift(<span key="v1"><i style={{ background: 'linear-gradient(90deg,#00204D,#FFEA46)' }} />{g.sciValue}</span>);
    if (roverTrack && showRover) items.push(<span key="r"><i className="ln" style={{ background: `repeating-linear-gradient(90deg, ${ROUTE_COL.rover} 0 4px, #26201C 4px 8px)` }} />{g.roverTrack}</span>);
    return items;
  }, [layer, roverTrack, showRover, env.sep, env.tau, t]);

  const lmst = `${Math.floor(clock.lmst)}:${String(Math.floor((clock.lmst % 1) * 60)).padStart(2, '0')}`;
  return (
    <LanguageContext.Provider value={lang}>
      <div className="app">
        <div className="topbar">
          <div className="wordmark"><b>Martian Map</b><span>{t.app.tagline}</span></div>
          <div className="seg" data-tour="scenes">{SCENES.map(s => <button key={s.id} className={sceneId === s.id ? 'on' : ''} onClick={() => setSceneId(s.id)}>{s.name}</button>)}</div>
          <div style={{ flex: 1 }} />
          <span className="mono clock" title={t.app.clockTitle}>{t.app.clock(clock.sol, lmst, clock.lightMin.toFixed(1))}</span>
          <Verdict level={verdict.level} text={verdict.text} />
          <div className="controls" data-tour="controls">
            <div className="seg lang" role="group" aria-label={t.app.language} title={t.app.language}>
              <svg className="globe" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.2" /><path d="M1.6 8h12.8M8 1.6c2.3 2 2.3 10.8 0 12.8M8 1.6c-2.3 2-2.3 10.8 0 12.8" fill="none" stroke="currentColor" strokeWidth="1.2" /></svg>
              {LANGUAGES.map(l => <button key={l.id} lang={l.id} title={l.name} aria-label={l.name} aria-pressed={lang === l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)}>{l.short}</button>)}
            </div>
            <button className="btn icon" title={theme === 'dark' ? t.app.themeToLight : t.app.themeToDark} aria-label={theme === 'dark' ? t.app.themeToLight : t.app.themeToDark} onClick={() => setTheme(v => v === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button>
            <button className="btn" title={t.app.tourTitle} onClick={() => setTour(true)}>? {t.app.tour}</button>
            <button className="btn" title={t.app.hudTitle} disabled={!active} onClick={() => setHud(true)}>{t.app.hud}</button>
          </div>
        </div>

        {planner.scene && def ? (
          <LeftRail def={def} pois={pois} selected={selected} setSelected={setSelected} result={result} activeId={activeId}
            env={env} setEnv={setEnv} cfg={cfg} setCfg={setCfg} budgets={budgets} setBudgets={setBudgets} mode={mode} setMode={setMode}
            tool={tool} setTool={setTool} removePoi={removePoi} busy={planner.busy} onReplan={() => setCfg(c => ({ ...c }))} progress={progress} setProgress={setProgress} />
        ) : <div className="rail" />}

        <div className="mapwrap">
          <div className="layers">
            <div className="seg">{PRIMARY.map(id => <button key={id} className={layer === id ? 'on' : ''} onClick={() => setLayer(id)}>{t.app.layers[id]}</button>)}</div>
            <select value={MORE.includes(layer) ? layer : ''} onChange={e => e.target.value && setLayer(e.target.value as LayerId)}><option value="">{t.app.moreLayers}</option>{MORE.map(id => <option key={id} value={id}>{t.app.layers[id]}</option>)}</select>
            <div className="tg">
              <button className={showCorridor ? 'on' : ''} onClick={() => setShowCorridor(v => !v)}>{t.app.corridor}</button>
              <button className={showHavens ? 'on' : ''} onClick={() => setShowHavens(v => !v)}>{t.app.haven}</button>
              {roverTrack && <button className={showRover ? 'on' : ''} onClick={() => setShowRover(v => !v)}>{t.app.roverTrack}</button>}
            </div>
          </div>
          {scenarios.length > 0 && <div className={`banner ${env.sep ? 'nogo' : ''}`}>{scenarios.join(' · ')}<button title={t.app.resetScenarios} onClick={() => { setEnv(v => ({ ...v, ...NOMINAL, tau: 0.5 })); setProgress(0); }}>×</button></div>}
          <div className="demohint">{t.app.keys}</div>
          {planner.scene && def && <MapView scene={planner.scene} def={def} result={result} active={active} ghost={!nominal ? baseA : null} layer={layer} pois={pois} base={base} rover={rover}
            hover={hover} setHover={setHover} tool={tool} onAddPoi={addPoi} onSetBase={(x, y) => { setBase({ x, y }); setTool('pan'); }} onSetRover={(x, y) => { setRover({ x, y }); setTool('pan'); }}
            showCorridor={showCorridor} showHavens={showHavens} currentPt={current?.pt ?? null} roverTrack={roverTrack} showRover={showRover} selectedPoi={selectedPoi} onSelectPoi={setSelectedPoi} fitTick={fitTick}
            toLonLat={(x, y) => gridToLonLat(planner.scene!.meta, x, y)} emergency={env.sep || env.tau > 3} />}
          <div className="legend">{legend}</div>
          {(!planner.scene || planner.busy) && <div className="overlaymsg"><div style={{ textAlign: 'center' }}>{planner.scene ? t.app.engineRunning : t.app.sceneLoading(Math.round(planner.progress * 100))}<div className="progress"><i style={{ width: `${planner.scene ? 100 : planner.progress * 100}%` }} /></div></div></div>}
          {planner.error && <div className="overlaymsg bad">{t.app.error}: {planner.error}</div>}
        </div>

        {planner.scene && def && <RightPanel def={def} meta={planner.scene.meta} result={result} baseline={baseline} active={active} activeId={activeId} setActiveId={setActiveId} cfg={cfg} budgets={budgets} env={env} selectedPoi={selectedPoi} roverPov={roverPov} verdict={verdict} />}
        <div className="strip"><ProfileStrip route={active} hover={hover} setHover={setHover} cfg={cfg} o2Budget={budgets.o2} theme={theme} /></div>
        {hud && active && planner.scene && <HudMode route={active} cfg={cfg} o2Budget={budgets.o2} onExit={() => setHud(false)} sceneW={planner.scene.meta.W} sceneH={planner.scene.meta.H} shelterCountdown={result?.shelterCountdownMin ?? null} sep={env.sep} pov={roverPov} />}
        {def && <PrintSheet def={def} active={active} cfg={cfg} budgets={budgets} verdict={verdict} />}
        {tourVisible && <Tour onClose={closeTour} setLang={setLang} />}
      </div>
    </LanguageContext.Provider>
  );
}
