import { useEffect, useMemo, useState } from 'react';
import type { RouteResult } from '../engine/types';
import type { PlannerConfig } from '../engine/config';
import type { RoverPov } from './RightPanel';
import { fmt } from './bits';

interface Props { route: RouteResult; cfg: PlannerConfig; o2Budget: number; onExit: () => void; sceneW: number; sceneH: number; shelterCountdown: number | null; sep: boolean; pov: RoverPov | null }

export default function HudMode({ route, cfg, o2Budget, onExit, sceneW, sceneH, shelterCountdown, sep, pov }: Props) {
  const [i, setI] = useState(Math.min(12, route.points.length - 1));
  const [play, setPlay] = useState(false);
  const pts = route.points, p = pts[Math.min(i, pts.length - 1)];
  useEffect(() => { if (!play) return; const t = setInterval(() => setI(k => (k + 2) % pts.length), 60); return () => clearInterval(t); }, [play, pts.length]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === ' ') { e.preventDefault(); setPlay(v => !v); } if (e.key === 'Escape') onExit(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onExit]);
  const next = useMemo(() => {
    const out: { name: string; distM: number }[] = []; let acc = 0;
    for (const lg of route.legs) { acc += lg.distM; if (acc > p.distM + 1) out.push({ name: lg.to === 'BASE' ? 'HABİTAT' : lg.to, distM: acc - p.distM }); if (out.length === 2) break; }
    return out.length ? out : [{ name: 'HABİTAT', distM: 0 }];
  }, [route, p]);
  const ahead = pts[Math.min(i + 15, pts.length - 1)];
  const heading = (Math.atan2(ahead.x - p.x, -(ahead.y - p.y)) * 180 / Math.PI + 360) % 360;
  const o2Rem = o2Budget - p.o2Kg, bingoMin = p.margin / cfg.o2.nominalKgPerH * 60;
  const total = pts[pts.length - 1].tMin;
  const level = p.margin < 0 ? 'nogo' : (sep || p.S < 50 || p.timeToShelterMin > cfg.haven.maxMinutes * 2 || !p.buddyLos) ? 'caution' : 'go';
  const msg = sep ? `SEP — SIĞINAĞA ${fmt(shelterCountdown ?? p.timeToShelterMin)} DK` : p.margin < 0 ? 'WALK-BACK LİMİTİ — ACİL DÖNÜŞ' : p.S < 50 ? 'DİKKAT: DÜŞÜK GÜVENLİK HÜCRESİ' : !p.buddyLos ? 'EŞ ASTRONOT GÖRÜŞ HATTI KOPUK' : p.timeToShelterMin > cfg.haven.maxMinutes * 2 ? 'SIĞINAK UZAK' : '';
  const sx = 200 / Math.max(sceneW, sceneH);
  // background: nearest POI's Navcam frame whose azimuth is closest to the heading
  const bg = useMemo(() => {
    if (!pov) return null; let best: { file: string; d: number } | null = null;
    for (const k of Object.keys(pov)) { const wp = pov[k].waypoint; if (!wp) continue; const d = Math.hypot(wp.x - p.x, wp.y - p.y); if (d > 400) continue; for (const im of pov[k].images) { const da = Math.abs(((im.az - heading + 180) % 360) - 180); const score = d + da * 2; if (!best || score < best.d) best = { file: im.file, d: score }; } }
    return best?.file ?? null;
  }, [pov, p, heading]);
  const ticks: number[] = []; for (let a = -60; a <= 60; a += 10) ticks.push(a);
  const wpAz = (Math.atan2(ahead.x - p.x, -(ahead.y - p.y)) * 180 / Math.PI + 360) % 360; void wpAz;
  return (
    <div className="hud">
      {bg && <div className="bg" style={{ backgroundImage: `url(${bg})` }} />}
      <div className="visor" />
      <button className="btn exit" onClick={onExit}>Planlama ekranına dön (Esc)</button>
      <div className="tape">
        {ticks.map(a => { const h = ((heading + a) % 360 + 360) % 360; const x = 50 + a / 120 * 100; const major = h % 30 === 0; return <div key={a} className={`tick ${major ? 'major' : ''}`} style={{ left: `${x}%` }}>{major && <span>{h === 0 ? 'N' : h === 90 ? 'E' : h === 180 ? 'S' : h === 270 ? 'W' : h}</span>}</div>; })}
        <div className="own" />
      </div>
      <div className="top">
        <div>
          <div className="label">O₂ KALAN</div><div className="big">{fmt(o2Rem, 3)}<span className="unit">kg</span></div>
          <div className="label" style={{ marginTop: 10 }}>BİNGO'YA (1.2× DÖNÜŞ REZERVİ)</div><div className="big" style={{ color: p.margin < 0 ? 'var(--nogo)' : bingoMin < 20 ? 'var(--caution)' : 'var(--safe)' }}>{p.margin >= 0 ? '+' : ''}{fmt(bingoMin)}<span className="unit">dk</span></div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className="label">SONRAKİ · {next[0].name}</div>
          <div className="big">{fmt(next[0].distM)}<span className="unit">m</span> <span style={{ fontSize: 18 }}>{fmt(heading)}°</span></div>
          {next[1] && <div className="label" style={{ marginTop: 6 }}>SONRA · {next[1].name} · {fmt(next[1].distM)} m</div>}
          <div className="label" style={{ marginTop: 10 }}>EŞ ASTRONOT · {p.buddyLos ? 'GÖRÜŞ HATTI VAR' : 'GÖRÜŞ HATTI YOK'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">GEÇEN / TOPLAM</div><div className="big">{fmt(p.tMin)}<span className="unit">/ {fmt(total)} dk</span></div>
          <div className="label" style={{ marginTop: 10 }}>SIĞINAĞA (HABİTAT/ROVER)</div><div className="big" style={{ color: p.timeToShelterMin > cfg.haven.maxMinutes * 2 ? 'var(--caution)' : 'inherit' }}>{Number.isFinite(p.timeToShelterMin) ? fmt(p.timeToShelterMin) : '∞'}<span className="unit">dk</span></div>
          <div className="label" style={{ marginTop: 10 }}>KONUM ±</div><div style={{ fontSize: 20 }}>{fmt(p.rUnc, 1)} m {p.comm ? '· UWB FİX' : '· ADIM SAYAR'}</div>
        </div>
      </div>
      {msg && <div className={`warnbar ${level}`}>{msg}</div>}
      <div className="minimap">
        <svg width={200} height={200}>
          <polyline points={pts.slice(0, i + 1).filter((_, k) => k % 3 === 0).map(q => `${q.x * sx},${q.y * sx}`).join(' ')} fill="none" stroke="rgba(244,247,249,.35)" strokeWidth={1.5} />
          <polyline points={pts.slice(i).filter((_, k) => k % 3 === 0).map(q => `${q.x * sx},${q.y * sx}`).join(' ')} fill="none" stroke="#F4F7F9" strokeWidth={1.5} />
          {route.havens.map(h => <rect key={h.id} x={h.x * sx - 3} y={h.y * sx - 3} width={6} height={6} fill={sep ? '#FF3B30' : (h.id === 'BASE' || h.id === 'ROVER' ? '#F4F7F9' : 'none')} stroke={sep ? '#FF3B30' : '#5FE3B0'} />)}
          <g transform={`translate(${p.x * sx},${p.y * sx}) rotate(${heading})`}><polygon points="0,-7 5,5 -5,5" fill="#F4F7F9" /></g>
        </svg>
      </div>
      <div className="ctl">
        <button className="btn" onClick={() => setPlay(v => !v)}>{play ? '❚❚' : '▶'} (Space)</button>
        <input type="range" min={0} max={pts.length - 1} value={i} onChange={e => setI(parseInt(e.target.value))} />
        <span className="mono">{fmt(p.distM)} / {fmt(pts[pts.length - 1].distM)} m · S {fmt(p.S)} · eğim {p.slopeDeg}°</span>
      </div>
    </div>
  );
}
