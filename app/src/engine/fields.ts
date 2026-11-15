import type { PlannerConfig } from './config';
import type { SceneData, EnvState, POI } from './types';
import { airTempC, sunAzimuth, sunElevation } from './physio';

export interface Fields {
  S: Float32Array; V: Float32Array; C: Float32Array; veto: Uint8Array;
  shade: Uint8Array; comm: Uint8Array; T: Float32Array; R: Float32Array; Erisk: Float32Array;
  sunAz: number; sunEl: number; tAir: number;
  parts: { K: Uint8Array; E: Uint8Array; Z: Uint8Array; CLS: Uint8Array };
}

/** Horizon angle at azimuth az from 8 stored directions (linear interpolation). */
export function horizonAt(scene: SceneData, i: number, az: number): number {
  const a = ((az % 360) + 360) % 360, k = a / 45, k0 = Math.floor(k) % 8, k1 = (k0 + 1) % 8, f = k - Math.floor(k);
  const h0 = scene.ch[`HZ${k0}` as 'HZ0'][i], h1 = scene.ch[`HZ${k1}` as 'HZ0'][i];
  return h0 * (1 - f) + h1 * f;
}

/** Line of sight from base (antenna 2.5 m) to every cell (target 1.7 m) by radial sweep to perimeter. */
const viewshedCache = new Map<string, Uint8Array>();
export function viewshed(scene: SceneData, baseIdx: number): Uint8Array {
  const key = `${scene.meta.id}:${baseIdx}`;
  const hit = viewshedCache.get(key); if (hit) return hit;
  const out = viewshedUncached(scene, baseIdx);
  if (viewshedCache.size > 8) viewshedCache.clear();
  viewshedCache.set(key, out);
  return out;
}
function viewshedUncached(scene: SceneData, baseIdx: number): Uint8Array {
  const { W, H, cell_dx, cell_dy } = scene.meta, z = scene.elev;
  const vis = new Uint8Array(W * H);
  const bx = baseIdx % W, by = (baseIdx / W) | 0, z0 = z[baseIdx] + 2.5;
  const perim: [number, number][] = [];
  for (let x = 0; x < W; x++) { perim.push([x, 0]); perim.push([x, H - 1]); }
  for (let y = 1; y < H - 1; y++) { perim.push([0, y]); perim.push([W - 1, y]); }
  for (const [tx, ty] of perim) {
    const dx = tx - bx, dy = ty - by, n = Math.max(Math.abs(dx), Math.abs(dy));
    let maxSlope = -Infinity;
    for (let s = 1; s <= n; s++) {
      const x = Math.round(bx + dx * s / n), y = Math.round(by + dy * s / n), i = y * W + x;
      const dm = Math.hypot((x - bx) * cell_dx, (y - by) * cell_dy);
      const drop = dm * dm / (2 * 3396190);           // planetary curvature
      const slopeTarget = (z[i] + 1.7 - drop - z0) / dm;
      const slopeGround = (z[i] - drop - z0) / dm;
      if (slopeTarget >= maxSlope) vis[i] = 1;
      if (slopeGround > maxSlope) maxSlope = slopeGround;
    }
  }
  vis[baseIdx] = 1;
  return vis;
}

/** Shade mask for sun (az, el): horizon in sun direction above sun elevation. */
export function shadeMask(scene: SceneData, sunAz: number, sunEl: number): Uint8Array {
  const n = scene.meta.W * scene.meta.H, out = new Uint8Array(n);
  if (sunEl <= 0) { out.fill(1); return out; }
  const a = ((sunAz % 360) + 360) % 360, k = a / 45, k0 = Math.floor(k) % 8, k1 = (k0 + 1) % 8, fr = k - Math.floor(k);
  const h0 = scene.ch[`HZ${k0}` as 'HZ0'], h1 = scene.ch[`HZ${k1}` as 'HZ0'];
  for (let i = 0; i < n; i++) out[i] = (h0[i] * (1 - fr) + h1[i] * fr) > sunEl ? 1 : 0;
  return out;
}

const noveltyCache = new Map<string, Float32Array>();
export function novelty(scene: SceneData, pois: POI[]): Float32Array {
  const { W, H, cell_dx, cell_dy } = scene.meta, n = W * H;
  const sci = pois.filter(p => p.kind === 'science' || p.kind === 'sample' || p.kind === 'user');
  const key = scene.meta.id + '|' + sci.map(p => `${p.id}:${p.x.toFixed(0)},${p.y.toFixed(0)},${p.value}`).join(';');
  const hit = noveltyCache.get(key); if (hit) return hit;
  const out = new Float32Array(n);
  if (!sci.length) { out.fill(30); noveltyCache.set(key, out); return out; }
  // only cells within 4 e-folding lengths (240 m) of a POI are affected; loop over POI windows, not the whole grid
  for (const p of sci) {
    const rx = Math.ceil(240 / cell_dx), ry = Math.ceil(240 / cell_dy);
    const x0 = Math.max(0, Math.floor(p.x - rx)), x1 = Math.min(W - 1, Math.ceil(p.x + rx));
    const y0 = Math.max(0, Math.floor(p.y - ry)), y1 = Math.min(H - 1, Math.ceil(p.y + ry));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot((x - p.x) * cell_dx, (y - p.y) * cell_dy);
      const v = p.value * Math.exp(-d / 60);
      const i = y * W + x; if (v > out[i]) out[i] = v;
    }
  }
  if (noveltyCache.size > 6) noveltyCache.clear();
  noveltyCache.set(key, out);
  return out;
}

/** Rock abundance (%) → walking hazard index 0..100 (Golombek trip-band analysis). */
export function kRisk(kPct: number): number {
  const xs = [0, 5, 10, 20, 40, 60], ys = [0, 15, 30, 55, 85, 100];
  if (kPct >= 60) return 100;
  let j = 1; while (j < xs.length - 1 && kPct > xs[j]) j++;
  const f = (kPct - xs[j - 1]) / (xs[j] - xs[j - 1]);
  return ys[j - 1] + f * (ys[j] - ys[j - 1]);
}

/** S, V, C per cell. o2Ret (reverse-Dijkstra oxygen to base) feeds the O_durum term. */
export function computeFields(scene: SceneData, cfg: PlannerConfig, env: EnvState, baseIdx: number, pois: POI[],
  o2Ret: Float32Array | null, o2Tank: number, relaxRadiationVeto = false): Fields {
  const { W, H } = scene.meta, n = W * H, ch = scene.ch;
  const latC = (scene.meta.lat0 + scene.meta.lat1) / 2;
  const sunEl = sunElevation(env.ltst, latC, env.ls), sunAz = sunAzimuth(env.ltst, latC, env.ls);
  const tAir = env.airTempC ?? airTempC(env.ltst);
  const shade = shadeMask(scene, sunAz, sunEl);
  const comm = viewshed(scene, baseIdx);
  const N = novelty(scene, pois);
  const S = new Float32Array(n), V = new Float32Array(n), C = new Float32Array(n), veto = new Uint8Array(n);
  const T = new Float32Array(n), R = new Float32Array(n), Erisk = new Float32Array(n);
  const w = cfg.safety, sw = cfg.science, cw = cfg.confidence;
  const insol = 15 * Math.max(0, Math.sin(sunEl * Math.PI / 180));
  for (let i = 0; i < n; i++) {
    // temperature risk (team V2 formula)
    const t = tAir + (shade[i] ? -10 : insol);
    let Ti = 0;
    if (t < cfg.temperature.comfortLo) Ti = Math.min(100, (Math.abs(t) - 20) / cfg.temperature.coldSpan * 100);
    else if (t > cfg.temperature.comfortHi) Ti = Math.min(100, (t - 20) / cfg.temperature.hotSpan * 100);
    T[i] = Ti;
    // radiation: relative dose from sky-view factor, SEP boost
    const svf = ch.SVF[i] / 100;
    const doseRel = 1 - cfg.radiation.svfDoseSlope * (1 - svf);
    R[i] = cfg.radiation.baseOpen * doseRel + (env.sep ? cfg.radiation.sepBoost * doseRel : 0);
    // slope risk 0..100 (25° → 83, 30° → 100)
    const slope = ch.E[i];
    Erisk[i] = Math.min(100, slope / 30 * 100);
    // oxygen state: how expensive is it to get home from here, relative to tank
    const O = o2Ret ? Math.min(100, 100 * cfg.o2.reserveFactor * o2Ret[i] / Math.max(o2Tank, 1e-6)) : 0;
    let s = 100 - (w.K * kRisk(ch.K[i]) + w.E * Erisk[i] + w.Z * ch.Z[i] + w.R * R[i] + w.O * O + w.T * Ti)
      - w.shade * shade[i] - w.comm * (1 - comm[i]);
    // veto (team V2 hard thresholds)
    let v = 0;
    if (slope > cfg.veto.E || ch.K[i] > cfg.veto.K || ch.Z[i] > cfg.veto.Z || Ti > cfg.veto.T) v = 1;
    if (!relaxRadiationVeto && R[i] > cfg.veto.R) v = 1;
    if (ch.DV[i] <= 10) v = 1; // masked area (scale bar)
    if (v) s = 0;
    S[i] = Math.max(0, s); veto[i] = v;
    V[i] = sw.G * ch.G[i] + sw.DK * ch.DK[i] + sw.F * ch.F[i] + sw.N * N[i] + sw.H * ch.H[i];
    const qEff = Math.max(0, ch.Q[i] - cfg.shadeQualityPenalty * shade[i]);
    C[i] = cw.Q * qEff + cw.DV * ch.DV[i] + cw.M * ch.M[i] + cw.P * ch.P[i] + cw.LK * ch.LK[i];
  }
  return { S, V, C, veto, shade, comm, T, R, Erisk, sunAz, sunEl, tAir, parts: { K: ch.K, E: ch.E, Z: ch.Z, CLS: ch.CLS } };
}
