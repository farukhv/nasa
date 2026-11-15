import { useEffect, useRef } from 'react';
import type { RouteResult } from '../engine/types';
import type { PlannerConfig } from '../engine/config';
import { useI18n } from '../i18n';

const PAL = {
  light: { bg: '#F1E7D6', mute: '#94826F', lab: '#6E5A4B', elev: '#A0704F', elevFill: 'rgba(196,87,42,0.20)', nogo: '#C92B73', warn: '#C2820F', safe: '#1F8A68', sci: '#2166C9', sci40: 'rgba(33,102,201,.4)', sci50: 'rgba(33,102,201,.5)', rule: '#DDD3C2', ink: '#26201C', nogoFill: 'rgba(201,43,115,0.25)', tipBg: 'rgba(38,32,28,.94)', tipFg: '#E8E2D6' },
  dark: { bg: '#1B1411', mute: '#A89886', lab: '#C9BBA8', elev: '#D9A877', elevFill: 'rgba(217,168,119,0.22)', nogo: '#FF4FA8', warn: '#FFC23D', safe: '#5FE3B0', sci: '#6FB0FF', sci40: 'rgba(111,176,255,.4)', sci50: 'rgba(111,176,255,.5)', rule: '#4A3D35', ink: '#F4EFE6', nogoFill: 'rgba(255,79,168,0.25)', tipBg: 'rgba(244,239,230,.96)', tipFg: '#231B17' },
};

export default function ProfileStrip({ route, hover, setHover, cfg, o2Budget, theme }: { theme: 'light' | 'dark'; route: RouteResult | null; hover: number | null; setHover: (i: number | null) => void; cfg: PlannerConfig; o2Budget: number }) {
  const { t } = useI18n();
  const s = t.strip;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const c = PAL[theme];
    const W = cv.parentElement!.clientWidth, H = cv.parentElement!.clientHeight, dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const ctx = cv.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
    if (!route || route.points.length < 2) { ctx.fillStyle = c.mute; ctx.font = '11px JetBrains Mono'; ctx.fillText(s.noRoute, 12, 20); return; }
    const pts = route.points, L = 56, R = 16, T = 8, lanes = 3, laneH = (H - T - 18) / lanes;
    const dmax = pts[pts.length - 1].distM || 1;
    const X = (d: number) => L + (d / dmax) * (W - L - R);
    const font = () => { ctx.font = '10px JetBrains Mono'; ctx.fillStyle = c.lab; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; };
    // lane 1: elevation + slope colour
    let zmin = Infinity, zmax = -Infinity; for (const p of pts) { zmin = Math.min(zmin, p.elev); zmax = Math.max(zmax, p.elev); }
    const zr = Math.max(1, zmax - zmin);
    const y1 = (z: number) => T + laneH - 6 - ((z - zmin) / zr) * (laneH - 14);
    ctx.beginPath(); ctx.moveTo(X(0), T + laneH); for (const p of pts) ctx.lineTo(X(p.distM), y1(p.elev)); ctx.lineTo(X(dmax), T + laneH); ctx.closePath();
    ctx.fillStyle = c.elevFill; ctx.fill();
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; ctx.strokeStyle = b.slopeDeg > 20 ? c.nogo : b.slopeDeg > 12 ? c.warn : c.elev; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X(a.distM), y1(a.elev)); ctx.lineTo(X(b.distM), y1(b.elev)); ctx.stroke(); }
    font(); ctx.fillText(s.elevation, 4, T + 10); ctx.fillText(`${zmax.toFixed(0)} m`, 4, T + 22); ctx.fillText(`${zmin.toFixed(0)} m`, 4, T + laneH - 2);
    // lane 2: O₂ remaining vs reserve line (1.2 × return)
    const t2 = T + laneH, y2 = (v: number) => t2 + laneH - 4 - (v / o2Budget) * (laneH - 12);
    ctx.strokeStyle = c.rule; ctx.beginPath(); ctx.moveTo(L, t2); ctx.lineTo(W - R, t2); ctx.stroke();
    ctx.beginPath(); for (const p of pts) ctx.lineTo(X(p.distM), y2(Math.max(0, o2Budget - p.o2Kg))); ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); for (const p of pts) ctx.lineTo(X(p.distM), y2(Math.min(o2Budget, cfg.o2.reserveFactor * (Number.isFinite(p.o2Ret) ? p.o2Ret : o2Budget)))); ctx.strokeStyle = c.nogo; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    // margin fill where negative
    for (let i = 1; i < pts.length; i++) if (pts[i].margin < 0) { ctx.fillStyle = c.nogoFill; ctx.fillRect(X(pts[i - 1].distM), t2, Math.max(1, X(pts[i].distM) - X(pts[i - 1].distM)), laneH); }
    font(); ctx.fillText(s.o2Left, 4, t2 + 10); ctx.fillStyle = c.nogo; ctx.fillText(s.reserve, 4, t2 + 22);
    // lane 3: safety bar + time-to-haven
    const t3 = t2 + laneH;
    for (let i = 1; i < pts.length; i++) { const s = pts[i].S; ctx.fillStyle = s < 50 ? c.nogo : s < 70 ? c.warn : c.safe; ctx.fillRect(X(pts[i - 1].distM), t3 + 4, Math.max(1, X(pts[i].distM) - X(pts[i - 1].distM) + 0.5), 6); if (s < 50 && (i % 3 === 0)) { ctx.fillStyle = '#0E1114'; ctx.fillRect(X(pts[i].distM), t3 + 4, 1, 6); } if (!pts[i].buddyLos) { ctx.fillStyle = c.warn; ctx.fillRect(X(pts[i - 1].distM), t3 + 12, Math.max(1, X(pts[i].distM) - X(pts[i - 1].distM) + 0.5), 2); } }
    const hmax = Math.max(cfg.haven.maxMinutes * 1.5, 1);
    ctx.beginPath(); for (const p of pts) ctx.lineTo(X(p.distM), t3 + laneH - 4 - Math.min(1, (Number.isFinite(p.timeToHavenMin) ? p.timeToHavenMin : hmax) / hmax) * (laneH * 0.5)); ctx.strokeStyle = c.sci; ctx.lineWidth = 1.5; ctx.stroke();
    const yl = t3 + laneH - 4 - (cfg.haven.maxMinutes / hmax) * laneH * 0.5; ctx.strokeStyle = c.sci40; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(L, yl); ctx.lineTo(W - R, yl); ctx.stroke(); ctx.setLineDash([]);
    font(); ctx.fillText(s.safety, 4, t3 + 10); ctx.fillStyle = c.warn; ctx.fillText(s.noBuddy, 4, t3 + 20); ctx.fillStyle = c.sci; ctx.fillText(s.shelter, 4, t3 + laneH - 6);
    // min-margin marker on lane 2
    { let mi = 0; for (let i = 1; i < pts.length; i++) if (pts[i].margin < pts[mi].margin) mi = i; const x = X(pts[mi].distM); ctx.strokeStyle = c.ink; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(x, t2); ctx.lineTo(x, t2 + laneH); ctx.stroke(); ctx.setLineDash([]); font(); ctx.fillStyle = c.ink; const txt = s.minMargin(`${pts[mi].margin >= 0 ? '+' : ''}${pts[mi].margin.toFixed(3)}`, pts[mi].distM.toFixed(0)); ctx.fillText(txt, Math.min(x + 4, W - R - 180), t2 + 10); }
    // x axis
    font(); for (let d = 0; d <= dmax; d += niceStep(dmax)) { ctx.fillStyle = c.mute; ctx.fillText(d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${d} m`, X(d) - 8, H - 4); }
    // POI ticks
    let acc = 0; for (const lg of route.legs) { acc += lg.distM; const x = X(acc); ctx.strokeStyle = c.sci50; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - 16); ctx.stroke(); font(); ctx.fillStyle = c.sci; ctx.fillText(lg.to === 'BASE' ? s.base : lg.to, x + 3, T + 10); }
    // hover
    if (hover !== null && pts[hover]) { const p = pts[hover], x = X(p.distM); ctx.strokeStyle = c.nogo; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, H - 16); ctx.stroke();
      const txt = s.hover(p.distM.toFixed(0), p.tMin.toFixed(0), (o2Budget - p.o2Kg).toFixed(3), `${p.margin >= 0 ? '+' : ''}${p.margin.toFixed(3)}`, p.S.toFixed(0), p.slopeDeg, p.rUnc.toFixed(1), Number.isFinite(p.timeToHavenMin) ? p.timeToHavenMin.toFixed(0) : '∞', Number.isFinite(p.timeToShelterMin) ? p.timeToShelterMin.toFixed(0) : '∞');
      ctx.font = '11px JetBrains Mono'; const w = ctx.measureText(txt).width + 12; const tx = Math.min(x + 8, W - w - 4); ctx.fillStyle = c.tipBg; ctx.fillRect(tx, T, w, 18); ctx.fillStyle = c.tipFg; ctx.fillText(txt, tx + 6, T + 13); }
  }, [route, hover, cfg, o2Budget, theme, s]);

  const onMove = (e: React.MouseEvent) => {
    if (!route) return; const r = (e.target as HTMLElement).getBoundingClientRect(); const x = e.clientX - r.left, W = r.width;
    const d = ((x - 56) / (W - 72)) * (route.points[route.points.length - 1].distM || 1);
    let lo = 0, hi = route.points.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (route.points[m].distM < d) lo = m + 1; else hi = m; }
    setHover(lo);
  };
  return <div style={{ position: 'absolute', inset: 0 }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}><canvas ref={ref} /></div>;
}
function niceStep(d: number) { const p = Math.pow(10, Math.floor(Math.log10(d))); const r = d / p; return r >= 5 ? p : r >= 2 ? p / 2 : p / 5; }
