import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoadedScene } from '../usePlanner';
import type { SceneDef } from '../scenes';
import type { PlanResult, POI, RoutePoint, RouteResult } from '../engine/types';
import { TERRAIN_CLASSES } from '../engine/config';
import type { Tool } from '../App';
import { fmt } from './bits';

export type LayerId = 'none' | 'S' | 'V' | 'C' | 'CLS' | 'K' | 'E' | 'H' | 'shade' | 'comm';
export interface RoverData { waypoints: { sol: number; site: number; drive: number; x: number; y: number; elev: number }[]; traverse: number[][][] }

const SCI_BLUE = '#4C9BFF', SCI_RGB = [76, 155, 255];
const C = {
  safe: [95, 227, 176], caution: [255, 194, 61], nogo: [255, 79, 168], science: [79, 216, 255], comms: [244, 247, 249],
  cividis: [[0, 32, 77], [49, 68, 107], [102, 105, 112], [149, 143, 120], [203, 186, 105], [255, 234, 70]],
  cls: [[0, 0, 0, 0], [232, 226, 214, 150], [111, 163, 216, 150], [49, 68, 160, 190], [95, 227, 176, 150], [255, 79, 168, 170]],
};
const lerp = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const ramp = (stops: number[][], t: number) => { const n = stops.length - 1, i = Math.min(n - 1, Math.floor(t * n)), f = t * n - i; return lerp(stops[i], stops[i + 1], f); };

interface Props {
  scene: LoadedScene; def: SceneDef; result: PlanResult | null; active: RouteResult | null; ghost: RouteResult | null; layer: LayerId;
  pois: POI[]; base: { x: number; y: number }; rover: { x: number; y: number } | null; hover: number | null; setHover: (i: number | null) => void;
  tool: Tool; onAddPoi: (x: number, y: number) => void; onSetBase: (x: number, y: number) => void; onSetRover: (x: number, y: number) => void;
  showCorridor: boolean; showHavens: boolean; currentPt: RoutePoint | null;
  roverTrack: RoverData | null; showRover: boolean; selectedPoi: string | null; onSelectPoi: (id: string | null) => void;
  fitTick: number; toLonLat: (x: number, y: number) => { lon: number; lat: number };
  emergency: boolean;   // dust storm / SEP: shelters and waiting points drawn in red
}

export default function MapView(p: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [view, setView] = useState({ s: 1, ox: 0, oy: 0 });
  const [tip, setTip] = useState<{ x: number; y: number; idx: number; gx: number; gy: number } | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const { W, H, disp_scale: ds, cell_dx } = p.scene.meta;

  const fit = (iw: number, ih: number) => { const el = wrapRef.current; if (!el) return; const s = Math.min(el.clientWidth / iw, el.clientHeight / ih) * 0.98; setView({ s, ox: (el.clientWidth - iw * s) / 2, oy: (el.clientHeight - ih * s) / 2 }); };
  useEffect(() => { const im = new Image(); im.src = `/scenes/${p.scene.meta.id}/base.jpg`; im.onload = () => { setImg(im); fit(im.width, im.height); }; }, [p.scene.meta.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (img && p.fitTick) fit(img.width, img.height); }, [p.fitTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const overlay = useMemo(() => {
    if (p.layer === 'none') return null;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!, id = ctx.createImageData(W, H), d = id.data, f = p.result?.fields;
    for (let i = 0; i < W * H; i++) {
      let rgb: number[] | null = null, a = 0;
      switch (p.layer) {
        case 'S': { if (!f || f.veto[i]) break; const s = f.S[i]; rgb = s < 50 ? lerp(C.nogo, C.caution, s / 50) : lerp(C.caution, C.safe, (s - 50) / 50); a = 80; break; }
        case 'V': { if (!f) break; rgb = ramp(C.cividis, f.V[i] / 100); a = 140; break; }
        case 'C': { if (!f) break; rgb = lerp([30, 20, 40], C.science, f.C[i] / 100); a = 130; break; }
        case 'CLS': { const c = C.cls[p.scene.cls[i]]; rgb = c; a = c[3] * 0.8; break; }
        case 'K': { const k = p.scene.K[i]; rgb = ramp([[20, 30, 60], C.science, C.caution, C.nogo], Math.min(1, k / 40)); a = k < 2 ? 30 : 140; break; }
        case 'E': { const e = p.scene.E[i]; rgb = e > 25 ? C.nogo : e > 15 ? C.caution : e > 8 ? lerp(C.safe, C.caution, (e - 8) / 7) : C.safe; a = e < 3 ? 25 : 140; break; }
        case 'H': { rgb = ramp([[40, 40, 60], [111, 163, 216], C.science, [200, 255, 240]], p.scene.H[i] / 100); a = 130; break; }
        case 'shade': { if (!f) break; if (f.shade[i]) { rgb = [10, 12, 20]; a = 170; } break; }
        case 'comm': { if (!f) break; if (!f.comm[i]) { rgb = C.caution; a = 110; } break; }
      }
      if (rgb) { d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = a; }
    }
    ctx.putImageData(id, 0, 0); return cv;
  }, [p.layer, p.result, p.scene, W, H]);

  // veto / no-data: always visible, crisp (nearest-neighbour) edge + hatch
  const vetoCv = useMemo(() => {
    const f = p.result?.fields; if (!f) return null;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!, id = ctx.createImageData(W, H), d = id.data, v = f.veto, DV = p.scene.DV, Vs = f.V;
    for (let i = 0; i < W * H; i++) {
      if (!v[i]) { // scientifically important cells: light blue tint, always visible
        if (Vs[i] >= 70) { const a = Math.min(110, 40 + (Vs[i] - 70) * 3); d[i * 4] = SCI_RGB[0]; d[i * 4 + 1] = SCI_RGB[1]; d[i * 4 + 2] = SCI_RGB[2]; d[i * 4 + 3] = a; }
        continue;
      }
      const x = i % W, y = (i / W) | 0, nodata = DV[i] <= 10;
      const edge = (x > 0 && !v[i - 1]) || (x < W - 1 && !v[i + 1]) || (y > 0 && !v[i - W]) || (y < H - 1 && !v[i + W]);
      const hatch = ((x + y) % 8) < 2, col = nodata ? [120, 126, 132] : C.nogo;
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = edge ? 230 : hatch ? 200 : (nodata ? 60 : 40);
    }
    ctx.putImageData(id, 0, 0); return cv;
  }, [p.result, p.scene, W, H]);

  const corridorCv = useMemo(() => {
    if (!p.active) return null;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!, id = ctx.createImageData(W, H), d = id.data, m = p.active.corridor.mask;
    for (let i = 0; i < W * H; i++) if (m[i]) { d[i * 4] = 244; d[i * 4 + 1] = 247; d[i * 4 + 2] = 249; d[i * 4 + 3] = 90; }
    ctx.putImageData(id, 0, 0); return cv;
  }, [p.active, W, H]);

  useEffect(() => {
    const cv = canvasRef.current, el = wrapRef.current; if (!cv || !el) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = el.clientWidth * dpr; cv.height = el.clientHeight * dpr; cv.style.width = el.clientWidth + 'px'; cv.style.height = el.clientHeight + 'px';
    const ctx = cv.getContext('2d')!; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0E1114'; ctx.fillRect(0, 0, el.clientWidth, el.clientHeight);
    if (!img) return;
    const { s, ox, oy } = view;
    const g2s = (gx: number, gy: number) => [ox + gx * ds * s, oy + gy * ds * s];
    ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(img, 0, 0);
    ctx.fillStyle = 'rgba(14,17,20,0.12)'; ctx.fillRect(0, 0, img.width, img.height);
    if (overlay) { ctx.imageSmoothingEnabled = p.layer !== 'CLS'; ctx.drawImage(overlay, 0, 0, img.width, img.height); }
    if (vetoCv) { ctx.imageSmoothingEnabled = false; ctx.drawImage(vetoCv, 0, 0, img.width, img.height); }
    if (p.showCorridor && corridorCv) { ctx.imageSmoothingEnabled = true; ctx.drawImage(corridorCv, 0, 0, img.width, img.height); }
    ctx.restore();

    if (p.showRover && p.roverTrack) {
      ctx.save(); ctx.lineJoin = 'round';
      for (const seg of p.roverTrack.traverse) {
        ctx.beginPath(); seg.forEach(([gx, gy], i) => { const [x, y] = g2s(gx, gy); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.strokeStyle = '#0E1114'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#D9A877'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      }
      if (view.s * ds > 0.6) for (const w of p.roverTrack.waypoints) { const [x, y] = g2s(w.x, w.y); ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#D9A877'; ctx.fill(); }
      ctx.restore();
    }

    const drawRoute = (r: RouteResult, style: 'primary' | 'alt' | 'ghost') => {
      if (!r.points.length) return;
      ctx.beginPath(); r.points.forEach((pt, i) => { const [x, y] = g2s(pt.x + .5, pt.y + .5); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.setLineDash([]);
      if (style === 'ghost') { ctx.strokeStyle = 'rgba(163,171,178,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([2, 5]); ctx.stroke(); ctx.setLineDash([]); return; }
      ctx.strokeStyle = '#0E1114'; ctx.lineWidth = style === 'primary' ? 7 : 4; ctx.stroke();
      ctx.strokeStyle = style === 'primary' ? '#F4F7F9' : '#A3ABB2'; ctx.lineWidth = style === 'primary' ? 3.5 : 2;
      if (style === 'alt') { ctx.setLineDash([7, 6]); ctx.globalAlpha = 0.85; } ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      if (style !== 'primary') return;
      for (let i = 1; i < r.points.length; i++) {
        const a = r.points[i - 1], b = r.points[i]; if (b.S >= 70) continue;
        ctx.strokeStyle = b.S < 50 ? '#FF4FA8' : '#FFC23D'; ctx.lineWidth = 3.5; ctx.beginPath(); const [x0, y0] = g2s(a.x + .5, a.y + .5), [x1, y1] = g2s(b.x + .5, b.y + .5); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      let nextD = 75;
      for (let i = 1; i < r.points.length; i++) {
        const b = r.points[i]; if (b.distM < nextD) continue; nextD += 150;
        const a = r.points[Math.max(0, i - 4)], [x0, y0] = g2s(a.x + .5, a.y + .5), [x1, y1] = g2s(b.x + .5, b.y + .5), ang = Math.atan2(y1 - y0, x1 - x0);
        ctx.save(); ctx.translate(x1, y1); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(-6, -5); ctx.lineTo(1, 0); ctx.lineTo(-6, 5); ctx.strokeStyle = '#0E1114'; ctx.lineWidth = 4; ctx.stroke(); ctx.strokeStyle = '#F4F7F9'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      if (r.pointOfNoReturn !== null) { const pt = r.points[r.pointOfNoReturn], [x, y] = g2s(pt.x + .5, pt.y + .5); octagon(ctx, x, y, 9, '#FF4FA8'); label(ctx, x + 12, y - 10, 'DÖNÜŞÜ YOK', '#FF4FA8'); }
    };
    if (p.ghost) drawRoute(p.ghost, 'ghost');
    const other = p.result?.routes.find(r => r !== p.active); if (other) drawRoute(other, 'alt');
    if (p.active) drawRoute(p.active, 'primary');

    const RED = '#FF3B30';
    if (p.showHavens && p.active) for (const h of p.active.havens) {
      if (h.id === 'BASE' || h.id === 'ROVER') continue;
      const [x, y] = g2s(h.x + .5, h.y + .5);
      if (p.emergency) {
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,59,48,0.25)'; ctx.fill();
        ctx.fillStyle = '#0E1114'; ctx.fillRect(x - 8, y - 8, 16, 16); ctx.fillStyle = RED; ctx.fillRect(x - 6, y - 6, 12, 12);
        ctx.fillStyle = '#F4F7F9'; ctx.font = '600 9px IBM Plex Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(h.id, x, y + .5);
        label(ctx, x + 14, y - 12, `SAKLAN · ${h.id}`, RED);
      } else {
        ctx.fillStyle = '#0E1114'; ctx.fillRect(x - 8, y - 8, 16, 16); ctx.fillStyle = '#F4F7F9'; ctx.fillRect(x - 6, y - 6, 12, 12); ctx.strokeStyle = '#5FE3B0'; ctx.lineWidth = 2; ctx.strokeRect(x - 6, y - 6, 12, 12);
        ctx.fillStyle = '#0E1114'; ctx.font = '600 9px IBM Plex Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(h.id, x, y + .5);
      }
    }
    const order = p.active?.order ?? [];
    p.pois.forEach(poi => {
      const [x, y] = g2s(poi.x, poi.y), k = order.indexOf(poi.id);
      const col = poi.kind === 'user' ? '#F4F7F9' : SCI_BLUE;   // scientific targets: blue
      ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fillStyle = 'rgba(14,17,20,0.85)'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = k >= 0 ? col : 'rgba(163,171,178,.7)'; ctx.stroke();
      if (p.selectedPoi === poi.id) { ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.strokeStyle = '#F4F7F9'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.fillStyle = k >= 0 ? col : '#A3ABB2'; ctx.font = '600 11px IBM Plex Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(k >= 0 ? String(k + 1) : '·', x, y + .5);
      label(ctx, x + 14, y - 12, poi.name, k >= 0 ? col : '#A3ABB2');
    });
    const shelterCol = p.emergency ? RED : '#F4F7F9';
    { const [x, y] = g2s(p.base.x + .5, p.base.y + .5); if (p.emergency) { ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,59,48,0.25)'; ctx.fill(); } ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#0E1114'; ctx.fillRect(-9, -9, 18, 18); ctx.fillStyle = shelterCol; ctx.fillRect(-6, -6, 12, 12); ctx.restore(); label(ctx, x + 14, y + 4, p.emergency ? 'SIĞINAK · HABİTAT' : 'HABİTAT', shelterCol); }
    if (p.rover) { const [x, y] = g2s(p.rover.x + .5, p.rover.y + .5); if (p.emergency) { ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,59,48,0.25)'; ctx.fill(); } ctx.fillStyle = '#0E1114'; ctx.fillRect(x - 9, y - 7, 18, 14); ctx.fillStyle = shelterCol; ctx.fillRect(x - 7, y - 5, 14, 10); ctx.fillStyle = p.emergency ? '#F4F7F9' : '#0E1114'; ctx.font = '600 9px IBM Plex Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('R', x, y + .5); label(ctx, x + 14, y - 10, p.emergency ? 'SIĞINAK · ROVER' : 'ROVER', shelterCol); }
    if (p.currentPt) { const pt = p.currentPt, [x, y] = g2s(pt.x + .5, pt.y + .5); ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fillStyle = 'rgba(244,247,249,.25)'; ctx.fill(); ctx.strokeStyle = '#F4F7F9'; ctx.lineWidth = 2.5; ctx.stroke(); label(ctx, x + 14, y + 4, 'ASTRONOT', '#F4F7F9'); }
    if (p.hover !== null && p.active) { const pt = p.active.points[Math.min(p.hover, p.active.points.length - 1)]; if (pt) { const [x, y] = g2s(pt.x + .5, pt.y + .5); ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.strokeStyle = '#F4F7F9'; ctx.lineWidth = 2; ctx.stroke(); } }
  }, [img, view, overlay, vetoCv, corridorCv, p, ds]);

  const toGrid = (e: React.MouseEvent) => { const r = (e.target as HTMLElement).getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top; const gx = (sx - view.ox) / view.s / ds, gy = (sy - view.oy) / view.s / ds; return { gx, gy, sx, sy, inside: gx >= 0 && gy >= 0 && gx < W && gy < H }; };
  const onWheel = (e: React.WheelEvent) => { const r = (e.target as HTMLElement).getBoundingClientRect(); const mx = e.clientX - r.left, my = e.clientY - r.top; const f = Math.exp(-e.deltaY * 0.0012); setView(v => { const s = Math.min(40, Math.max(0.05, v.s * f)); const k = s / v.s; return { s, ox: mx - (mx - v.ox) * k, oy: my - (my - v.oy) * k }; }); };
  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY, ox: view.ox, oy: view.oy, moved: false }; };
  const onMove = (e: React.MouseEvent) => {
    if (drag.current) { const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y; if (Math.hypot(dx, dy) > 3) drag.current.moved = true; setView(v => ({ ...v, ox: drag.current!.ox + dx, oy: drag.current!.oy + dy })); return; }
    const g = toGrid(e); if (!g.inside) { setTip(null); p.setHover(null); return; }
    setTip({ x: g.sx, y: g.sy, idx: Math.floor(g.gy) * W + Math.floor(g.gx), gx: g.gx, gy: g.gy });
    if (p.active) { let bi = -1, bd = 10 / (view.s * ds); for (let i = 0; i < p.active.points.length; i += 2) { const q = p.active.points[i]; const d = Math.hypot(q.x + .5 - g.gx, q.y + .5 - g.gy); if (d < bd) { bd = d; bi = i; } } p.setHover(bi >= 0 ? bi : null); }
  };
  const onUp = (e: React.MouseEvent) => {
    const wasDrag = drag.current?.moved; drag.current = null; if (wasDrag) return;
    const g = toGrid(e); if (!g.inside) return;
    if (p.tool === 'poi') p.onAddPoi(g.gx, g.gy); else if (p.tool === 'base') p.onSetBase(g.gx, g.gy); else if (p.tool === 'rover') p.onSetRover(g.gx, g.gy);
    else { let hit: string | null = null, bd = 14 / (view.s * ds); for (const poi of p.pois) { const d = Math.hypot(poi.x - g.gx, poi.y - g.gy); if (d < bd) { bd = d; hit = poi.id; } } p.onSelectPoi(hit); }
  };

  const f = p.result?.fields, tipIdx = tip?.idx ?? -1;
  const mPerPx = cell_dx / (view.s * ds), barM = niceLength(120 * mPerPx);
  const ll = tip ? p.toLonLat(tip.gx, tip.gy) : null;
  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0, cursor: p.tool === 'pan' ? 'grab' : 'crosshair' }}
      onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={() => { drag.current = null; setTip(null); p.setHover(null); }} onDoubleClick={() => img && fit(img.width, img.height)}>
      <canvas ref={canvasRef} />
      {tip && tipIdx >= 0 && (
        <div className="tip" style={{ left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 400) - 210), top: tip.y + 14 }}>
          <div className="r"><span className="label">{TERRAIN_CLASSES[p.scene.cls[tipIdx]]?.name}</span><span>{fmt(p.scene.elev[tipIdx], 1)} m</span></div>
          <div className="r"><span>Kaya · eğim · gökyüzü</span><span>%{p.scene.K[tipIdx]} · {p.scene.E[tipIdx]}° · %{p.scene.SVF[tipIdx]}</span></div>
          {f && <>
            <div className="r"><span>Güvenlik / bilim / güven</span><span><b className={f.S[tipIdx] < 50 ? 'bad' : f.S[tipIdx] < 70 ? 'warn' : 'ok'}>{f.S[tipIdx]}</b> / <span className="sci">{f.V[tipIdx]}</span> / {f.C[tipIdx]}</span></div>
            <div className="r"><span>Üsse dönüş O₂</span><span>{f.o2Ret[tipIdx] > 1e30 ? '∞' : fmt(f.o2Ret[tipIdx], 3)} kg</span></div>
            <div className="r"><span>{f.shade[tipIdx] ? 'gölge' : 'güneş'} · {f.comm[tipIdx] ? 'LOS var' : 'LOS yok'}</span><span className={f.veto[tipIdx] ? 'bad' : ''}>{f.veto[tipIdx] ? (p.scene.DV[tipIdx] <= 10 ? 'VERİ YOK' : 'VETO') : ''}</span></div>
          </>}
        </div>
      )}
      <div className="mapfoot">
        <span className="north">N ↑</span>
        {ll && <span>{ll.lat.toFixed(5)}°N {ll.lon.toFixed(5)}°E</span>}
        <span className="bar">{barM >= 1000 ? `${barM / 1000} km` : `${barM} m`}<i style={{ width: barM / mPerPx }} /></span>
      </div>
    </div>
  );
}

function niceLength(m: number) { const p = Math.pow(10, Math.floor(Math.log10(m))); const r = m / p; return (r >= 5 ? 5 : r >= 2 ? 2 : 1) * p; }
function octagon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; const px = x + r * Math.cos(a), py = y + r * Math.sin(a); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath();
  ctx.fillStyle = '#0E1114'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
}
function label(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, col: string) {
  ctx.font = '500 11px IBM Plex Sans'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 10; ctx.fillStyle = 'rgba(14,17,20,0.85)'; ctx.fillRect(x - 4, y - 9, w, 18);
  ctx.fillStyle = col; ctx.fillText(text, x, y + .5);
}
