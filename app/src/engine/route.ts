import type { PlannerConfig } from './config';
import type { SceneData, POI, PlanRequest, PlanResult, RouteResult, RoutePoint, EnvState, StraightLineEval, EvaWindowHour } from './types';
import { computeFields, horizonAt, type Fields } from './fields';
import { makeCostModel, dijkstra, astar, backtrack, distanceTransform, DX, DY, type CostModel } from './search';
import { MinHeap } from './heap';
import { stepWater, airTempC, sunAzimuth, sunElevation } from './physio';

const INF = 3e38;
const retCache = new Map<string, { veto0: Uint8Array; o2Ret: Float32Array }>();
const shelterCache = new Map<string, Float32Array>();
const CLASS_TR = ['sıkı toprak', 'anakaya', 'kayalık', 'kaya tarlası', 'kum dalgası', 'krater kenarı'];

function idxOf(scene: SceneData, p: { x: number; y: number }) {
  const W = scene.meta.W, H = scene.meta.H;
  return Math.min(H - 1, Math.max(0, Math.round(p.y))) * W + Math.min(W - 1, Math.max(0, Math.round(p.x)));
}

/** Snap to the nearest non-veto cell within radius (cells). */
function snap(scene: SceneData, veto: Uint8Array, idx: number, radius = 12): number {
  if (!veto[idx]) return idx;
  const W = scene.meta.W, H = scene.meta.H, x0 = idx % W, y0 = (idx / W) | 0;
  let best = -1, bd = Infinity;
  for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
    const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = y * W + x; if (veto[i]) continue;
    const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; }
  }
  return best;
}

function stepIndex(W: number, u: number, v: number) {
  const dx = (v % W) - (u % W), dy = ((v / W) | 0) - ((u / W) | 0);
  for (let k = 0; k < 8; k++) if (DX[k] === dx && DY[k] === dy) return k;
  return 0;
}
function pathCosts(scene: SceneData, cm: CostModel, p: number[]) {
  let o2 = 0, t = 0;
  for (let k = 1; k < p.length; k++) { const d = cm.stepLen(stepIndex(scene.meta.W, p[k - 1], p[k])); o2 += cm.o2(p[k - 1], p[k], d); t += cm.time(p[k - 1], p[k], d); }
  return { o2, tMin: t / 60 };
}

interface Leg { from: string; to: string; path: number[]; planCost: number }
interface Node { id: string; idx: number; poi: POI | null }

/** 2× coarse copy of the scene for ORDERING decisions only (veto = any sub-cell vetoed, S = min, V = mean, elev = mean). */
function coarsen(scene: SceneData, f: Fields, veto: Uint8Array) {
  const { W, H } = scene.meta, w = W >> 1, h = H >> 1;
  const elev = new Float32Array(w * h), S = new Float32Array(w * h), V = new Float32Array(w * h), CLS = new Uint8Array(w * h), cv = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i0 = (2 * y) * W + 2 * x, i1 = i0 + 1, i2 = i0 + W, i3 = i2 + 1, j = y * w + x;
    elev[j] = (scene.elev[i0] + scene.elev[i1] + scene.elev[i2] + scene.elev[i3]) / 4;
    S[j] = Math.min(f.S[i0], f.S[i1], f.S[i2], f.S[i3]);
    V[j] = (f.V[i0] + f.V[i1] + f.V[i2] + f.V[i3]) / 4;
    CLS[j] = Math.max(scene.ch.CLS[i0], scene.ch.CLS[i1], scene.ch.CLS[i2], scene.ch.CLS[i3]);
    cv[j] = (veto[i0] | veto[i1] | veto[i2] | veto[i3]) as 0 | 1;
  }
  const cscene = { meta: { ...scene.meta, W: w, H: h, cell_dx: scene.meta.cell_dx * 2, cell_dy: scene.meta.cell_dy * 2 }, elev, ch: { ...scene.ch, CLS } } as SceneData;
  const cf = { ...f, S, V, parts: { ...f.parts, CLS } } as Fields;
  return { cscene, cf, cv, toCoarse: (idx: number) => { const x = Math.min(w - 1, (idx % W) >> 1), y = Math.min(h - 1, ((idx / W) | 0) >> 1); return y * w + x; } };
}

/** Visiting order: bitmask DP (Held–Karp / orienteering) with O₂ AND time budgets, early-exit Dijkstras. */
function orienteer(scene: SceneData, cfg: PlannerConfig, veto: Uint8Array, cm: CostModel, startIdx: number, baseIdx: number,
  targets: { poi: POI; idx: number }[], o2Budget: number, minutesBudget: number, cPoi: (idx: number) => number, log: string[],
  fine?: { scene: SceneData; veto: Uint8Array; cm: CostModel; map: (coarseIdx: number) => number }) {
  const nodes: Node[] = [{ id: 'START', idx: startIdx, poi: null }, ...targets.map(t => ({ id: t.poi.id, idx: t.idx, poi: t.poi as POI | null })), { id: 'BASE', idx: baseIdx, poi: null }];
  const n = nodes.length, B = n - 1;
  const planC: number[][] = [], o2C: number[][] = [], tC: number[][] = [], paths: (number[] | null)[][] = [];
  // cost TO base for every cell: one reverse Dijkstra (asymmetric costs handled by reversed edges)
  const rB = dijkstra(scene, veto, cm.plan, cm.stepLen, [baseIdx], { reverse: true, quantum: cm.quanta.plan });
  const targetSet = new Set(targets.map(t => t.idx));
  for (let i = 0; i < B; i++) {
    const goals = i === 0 ? new Set([...targetSet, baseIdx]) : targetSet;   // target rows stop as soon as the other targets are settled
    const r = dijkstra(scene, veto, cm.plan, cm.stepLen, [nodes[i].idx], { goals, quantum: cm.quanta.plan });
    planC.push([]); o2C.push([]); tC.push([]); paths.push([]);
    for (let j = 0; j < n; j++) {
      if (i === j || nodes[i].idx === nodes[j].idx) { planC[i][j] = 0; o2C[i][j] = 0; tC[i][j] = 0; paths[i][j] = [nodes[i].idx]; continue; }
      let p: number[] | null = null, pc = INF;
      if (j === B) { if (rB.dist[nodes[i].idx] < INF) { p = backtrack(rB.parent, nodes[i].idx).reverse(); pc = rB.dist[nodes[i].idx]; } }
      else if (r.dist[nodes[j].idx] < INF) { p = backtrack(r.parent, nodes[j].idx); pc = r.dist[nodes[j].idx]; }
      if (!p) { planC[i][j] = INF; o2C[i][j] = INF; tC[i][j] = INF; paths[i][j] = null; continue; }
      const c = pathCosts(scene, cm, p);
      planC[i][j] = pc; o2C[i][j] = c.o2; tC[i][j] = c.tMin; paths[i][j] = p;
    }
  }
  planC.push(new Array(n).fill(INF)); o2C.push(new Array(n).fill(INF)); tC.push(new Array(n).fill(INF)); paths.push(new Array(n).fill(null));
  const skipped: { id: string; reason: string }[] = [];
  const live: number[] = [];
  targets.forEach((_t, k) => { const q = k + 1; if (planC[0][q] < INF && planC[q][B] < INF) live.push(q); else skipped.push({ id: nodes[q].id, reason: 'Veto dışı güvenli bir yol yok' }); });
  const m = live.length, size = 1 << m;
  const dp = new Float32Array(size * m).fill(INF), dt = new Float32Array(size * m).fill(INF), par = new Int32Array(size * m).fill(-1);
  const dwellMin = (k: number) => nodes[k].poi?.dwellMin ?? 15;
  const dwellO2 = (k: number) => (dwellMin(k) / 60) * cfg.o2.nominalKgPerH;
  for (let j = 0; j < m; j++) { dp[(1 << j) * m + j] = o2C[0][live[j]] + dwellO2(live[j]); dt[(1 << j) * m + j] = tC[0][live[j]] + dwellMin(live[j]); }
  for (let mask = 1; mask < size; mask++) for (let j = 0; j < m; j++) {
    const cur = dp[mask * m + j]; if (cur >= INF || !(mask & (1 << j))) continue;
    for (let k = 0; k < m; k++) {
      if (mask & (1 << k)) continue;
      const nm = mask | (1 << k), nv = cur + o2C[live[j]][live[k]] + dwellO2(live[k]);
      if (nv < dp[nm * m + k]) { dp[nm * m + k] = nv; dt[nm * m + k] = dt[mask * m + j] + tC[live[j]][live[k]] + dwellMin(live[k]); par[nm * m + k] = j; }
    }
  }
  const usable = o2Budget / cfg.o2.reserveFactor;
  let bestMask = 0, bestJ = -1, bestPrize = -1, bestO2 = 0, bestT = 0, o2Bound = 0, tBound = 0;
  for (let mask = 1; mask < size; mask++) for (let j = 0; j < m; j++) {
    const v = dp[mask * m + j]; if (v >= INF) continue;
    const total = v + o2C[live[j]][B], tt = dt[mask * m + j] + tC[live[j]][B];
    if (total > usable) { o2Bound++; continue; }
    if (tt > minutesBudget) { tBound++; continue; }
    let prize = 0; for (let k = 0; k < m; k++) if (mask & (1 << k)) prize += (nodes[live[k]].poi!.value) * cPoi(nodes[live[k]].idx) / 100;
    if (prize > bestPrize + 1e-9 || (Math.abs(prize - bestPrize) < 1e-9 && total < bestO2)) { bestPrize = prize; bestMask = mask; bestJ = j; bestO2 = total; bestT = tt; }
  }
  const order: number[] = [];
  if (bestJ >= 0) { let mask = bestMask, j = bestJ; while (j >= 0) { order.unshift(live[j]); const pj = par[mask * m + j]; mask &= ~(1 << j); j = pj; } }
  for (const k of live) if (!order.includes(k)) {
    const soloO2 = o2C[0][k] + dwellO2(k) + o2C[k][B], soloT = tC[0][k] + dwellMin(k) + tC[k][B];
    skipped.push({ id: nodes[k].id, reason: soloT > minutesBudget ? `süre bütçesi (${minutesBudget} dk) yetmiyor` : soloO2 > usable ? `O₂ bütçesi (kullanılabilir ${usable.toFixed(2)} kg) yetmiyor` : 'diğer hedeflerle birlikte bütçeye sığmıyor; daha düşük bilim değeri' });
  }
  if (m > 0) log.push(`Orienteering DP: ${m} hedef, ${size * m} durum; ${order.length} hedef seçildi (O₂ ${bestO2.toFixed(3)} ≤ ${usable.toFixed(3)} kg, süre ${bestT.toFixed(0)} ≤ ${minutesBudget.toFixed(0)} dk). Bütçe dışı kombinasyon: O₂ ${o2Bound}, süre ${tBound}.`);
  const seq = [0, ...order, B];
  const legs: Leg[] = [];
  if (fine) {
    // ordering was decided on the coarse grid; solve the chosen legs exactly on the fine grid
    for (let i = 1; i < seq.length; i++) {
      const a = fine.map(nodes[seq[i - 1]].idx), b = fine.map(nodes[seq[i]].idx); if (a === b) continue;
      const r = astar(fine.scene, fine.veto, fine.cm, a, b);
      if (!r) { legs.length = 0; break; }
      legs.push({ from: nodes[seq[i - 1]].id, to: nodes[seq[i]].id, path: r.path, planCost: r.cost });
    }
    const fineNodes: Node[] = nodes.map(nd => ({ ...nd, idx: fine.map(nd.idx) }));
    return { legs, order: order.map(k => nodes[k].id), skipped, nodes: fineNodes };
  }
  for (let i = 1; i < seq.length; i++) { const a = seq[i - 1], b = seq[i], p = paths[a][b]; if (!p || p.length < 2) continue; legs.push({ from: nodes[a].id, to: nodes[b].id, path: p, planCost: planC[a][b] }); }
  return { legs, order: order.map(k => nodes[k].id), skipped, nodes };
}

function legsWithAstar(scene: SceneData, veto: Uint8Array, cm: CostModel, nodes: Node[], order: string[]): Leg[] | null {
  const byId = new Map(nodes.map(nd => [nd.id, nd.idx]));
  const seq = ['START', ...order, 'BASE'], legs: Leg[] = [];
  for (let i = 1; i < seq.length; i++) {
    const a = byId.get(seq[i - 1])!, b = byId.get(seq[i])!;
    if (a === b) continue;
    const r = astar(scene, veto, cm, a, b); if (!r) return null;
    legs.push({ from: seq[i - 1], to: seq[i], path: r.path, planCost: r.cost });
  }
  return legs;
}

/** Line of sight between two cells over the DEM (eye heights 1.7 m). */
function los(scene: SceneData, a: number, b: number): boolean {
  const W = scene.meta.W, z = scene.elev;
  const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0, n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
  if (n < 2) return true;
  const z0 = z[a] + 1.7, z1 = z[b] + 1.7;
  for (let s = 1; s < n; s++) {
    const x = Math.round(ax + (bx - ax) * s / n), y = Math.round(ay + (by - ay) * s / n), f = s / n;
    if (z[y * W + x] > z0 + (z1 - z0) * f) return false;
  }
  return true;
}

function buildPoints(scene: SceneData, cfg: PlannerConfig, f: Fields, env: EnvState, legs: Leg[], pois: Map<string, POI>,
  cmFor: (sampleKg: number) => CostModel, o2Ret: Float32Array, o2Budget: number, o2Used: number, minutesUsed: number) {
  const W = scene.meta.W, pts: RoutePoint[] = [], legStats: RouteResult['legs'] = [];
  let dist = 0, t = minutesUsed, o2 = o2Used, water = 0, carried = env.sampleKg, dSinceFix = 0, tSinceFix = 0;
  const push = (idx: number) => {
    const o2Rem = o2Budget - o2, ret = o2Ret[idx] >= INF ? Infinity : o2Ret[idx];
    const rNav = env.imuOnly ? cfg.nav.r0m + cfg.nav.imuA * (tSinceFix * 60) ** 2 : cfg.nav.r0m + cfg.nav.pdrFrac * dSinceFix;
    pts.push({ idx, x: idx % W, y: (idx / W) | 0, distM: dist, tMin: t, o2Kg: o2, waterKg: water,
      S: f.S[idx], V: f.V[idx], C: f.C[idx], elev: scene.elev[idx], slopeDeg: scene.ch.E[idx], cls: scene.ch.CLS[idx],
      shade: f.shade[idx], comm: f.comm[idx], o2Ret: ret, margin: o2Rem - cfg.o2.reserveFactor * ret,
      rUnc: Math.min(cfg.nav.maxCorridorM, rNav), timeToHavenMin: NaN, timeToShelterMin: NaN, buddyLos: 1 });
  };
  push(legs[0].path[0]);
  for (const leg of legs) {
    const cm = cmFor(carried); let ld = 0, lt = 0, lo = 0;
    for (let k = 1; k < leg.path.length; k++) {
      const u = leg.path[k - 1], v = leg.path[k], d = cm.stepLen(stepIndex(W, u, v));
      const dtS = cm.time(u, v, d), so2 = cm.o2(u, v, d);
      dist += d; t += dtS / 60; o2 += so2; water += stepWater(cfg, so2, dtS / 3600); ld += d; lt += dtS / 60; lo += so2;
      if (f.comm[v]) { dSinceFix = 0; tSinceFix = 0; } else { dSinceFix += d; tSinceFix += dtS / 60; }
      push(v);
    }
    const poi = pois.get(leg.to);
    if (poi && poi.kind !== 'base') {
      const dwell = poi.dwellMin ?? 15, dO2 = (dwell / 60) * cfg.o2.nominalKgPerH;
      t += dwell; o2 += dO2; water += stepWater(cfg, dO2, dwell / 60); lt += dwell; lo += dO2; carried += poi.sampleKg ?? 0;
      const last = pts[pts.length - 1]; last.tMin = t; last.o2Kg = o2; last.waterKg = water; last.margin = (o2Budget - o2) - cfg.o2.reserveFactor * (Number.isFinite(last.o2Ret) ? last.o2Ret : o2Budget);
    }
    legStats.push({ from: leg.from, to: leg.to, distM: ld, tMin: lt, o2Kg: lo });
  }
  // buddy 60 s behind on the same track: mutual line of sight (checked every 3rd point)
  if (env.buddy) {
    let j = 0;
    for (let i = 0; i < pts.length; i++) {
      while (j < i && pts[i].tMin - pts[j].tMin > 1.0) j++;
      if (i % 3 === 0) pts[i].buddyLos = los(scene, pts[i].idx, pts[j].idx) ? 1 : 0; else pts[i].buddyLos = pts[i - 1].buddyLos;
    }
  }
  return { pts, legStats };
}

function corridorMask(scene: SceneData, veto: Uint8Array, pts: RoutePoint[], cfg: PlannerConfig) {
  const { W, H, cell_dx, cell_dy } = scene.meta, n = W * H;
  const dist = new Float32Array(n).fill(INF), mask = new Uint8Array(n), heap = new MinHeap(Math.max(1024, n >> 3));
  let maxR = 0;
  const radii = pts.map(p => Math.min(cfg.nav.maxCorridorM, Math.max(cfg.nav.minCorridorM, p.rUnc + cfg.nav.corridorSafetyM * (100 - p.S) / 100)));
  for (const r of radii) maxR = Math.max(maxR, r);
  pts.forEach((p, i) => { const k = maxR - radii[i]; if (k < dist[p.idx]) { dist[p.idx] = k; heap.push(p.idx, k); } });
  const lens = [cell_dx, Math.hypot(cell_dx, cell_dy), cell_dy, Math.hypot(cell_dx, cell_dy), cell_dx, Math.hypot(cell_dx, cell_dy), cell_dy, Math.hypot(cell_dx, cell_dy)];
  while (heap.size) {
    const du = heap.peekKey(), u = heap.pop(); if (du > dist[u]) continue; if (du > maxR) break;
    mask[u] = 1; const ux = u % W, uy = (u / W) | 0;
    for (let k = 0; k < 8; k++) { const vx = ux + DX[k], vy = uy + DY[k]; if (vx < 0 || vy < 0 || vx >= W || vy >= H) continue; const v = vy * W + vx; if (veto[v]) continue; const nd = du + lens[k]; if (nd < dist[v]) { dist[v] = nd; heap.push(v, nd); } }
  }
  return { mask, maxR };
}

interface HavenFields { havens: POI[]; rH: Float32Array; rS: Float32Array; shelterCount: number }
/** Shelters (real): base + rover. Waiting points (terrain): high-S, low sky-view, flat cells near route samples.
 *  Cost: ONE bounded reverse Dijkstra (coverage) + ONE reverse Dijkstra (shelters); candidates chosen geometrically. */
function pickHavens(scene: SceneData, cfg: PlannerConfig, f: Fields, veto: Uint8Array, cm: CostModel, pts: RoutePoint[], baseIdx: number, roverIdx: number | null, env: EnvState, preset?: HavenFields) {
  const { W, H, cell_dx, cell_dy } = scene.meta, svf = scene.ch.SVF, E = scene.ch.E;
  let hf: HavenFields;
  if (preset) hf = preset;
  else {
    const bx = baseIdx % W, by = (baseIdx / W) | 0;
    const shelters: POI[] = [{ id: 'BASE', name: 'Habitat / iniş aracı', x: bx, y: by, kind: 'haven', value: 0, note: 'Gerçek sığınak' }];
    if (roverIdx !== null && roverIdx !== undefined && !env.roverLost) shelters.push({ id: 'ROVER', name: 'Basınçlı rover', x: roverIdx % W, y: (roverIdx / W) | 0, kind: 'haven', value: 0, note: 'Gerçek sığınak (mobil)' });
    let sMax = 0; for (let i = 0; i < W * H; i += 7) if (f.S[i] > sMax) sMax = f.S[i];
    const minS = Math.min(cfg.haven.minS, sMax - 10);
    const score = (i: number) => {
      if (veto[i] || f.S[i] < minS || E[i] > cfg.haven.maxSlopeDeg) return -1;
      const d = Math.hypot(((i % W) - bx) * cell_dx, (((i / W) | 0) - by) * cell_dy);
      return 0.45 * f.S[i] + 0.35 * (100 - svf[i]) + 0.20 * 100 * Math.max(0, 1 - d / 500);
    };
    // reach radius: budget minutes at ~0.6 of nominal walking speed (terrain/geodesic allowance)
    const reachM = cfg.haven.maxMinutes * 60 * (cfg.walk.maxKmH * cfg.walk.toblerSuitFactor / 3.6) * 0.6;
    const total = pts[pts.length - 1].tMin - pts[0].tMin, every = Math.max(12, total / cfg.haven.maxCount);
    const havens: POI[] = [...shelters];
    let next = pts[0].tMin + every / 2;
    const rx = Math.ceil(reachM / cell_dx), ry = Math.ceil(reachM / cell_dy), step = Math.max(2, Math.round(rx / 60));
    for (const p of pts) {
      if (p.tMin < next) continue; next += every;
      if (havens.length >= cfg.haven.maxCount + shelters.length) break;
      let bi = -1, bs = -1;
      for (let y = Math.max(0, p.y - ry); y <= Math.min(H - 1, p.y + ry); y += step) for (let x = Math.max(0, p.x - rx); x <= Math.min(W - 1, p.x + rx); x += step) {
        const dM = Math.hypot((x - p.x) * cell_dx, (y - p.y) * cell_dy); if (dM > reachM) continue;
        const i = y * W + x, sc = score(i); if (sc < 0) continue;
        const v = sc - 25 * (dM / reachM); if (v > bs) { bs = v; bi = i; }
      }
      if (bi < 0) continue;
      const hx = bi % W, hy = (bi / W) | 0;
      if (havens.some(h => Math.hypot((h.x - hx) * cell_dx, (h.y - hy) * cell_dy) < 40)) continue;
      const k = havens.length - shelters.length + 1;
      havens.push({ id: `W${k}`, name: `Bekleme noktası ${k}`, x: hx, y: hy, kind: 'haven', value: 0, note: `S=${f.S[bi].toFixed(0)}, gökyüzü görüşü %${svf[bi]}, eğim ${E[bi]}°, doz ≈ −${(100 * cfg.radiation.svfDoseSlope * (1 - svf[bi] / 100)).toFixed(0)} %` });
    }
    const budgetS = cfg.haven.maxMinutes * 60;
    const rH = dijkstra(scene, veto, cm.time, cm.stepLen, havens.map(h => idxOf(scene, h)), { reverse: true, cutoff: budgetS * 2.5, quantum: cm.quanta.time }).dist;
    const sKey = JSON.stringify([scene.meta.id, baseIdx, roverIdx, env.roverLost, env.injured, env.tau, env.sep, env.ltst, env.ls, cfg.veto, cfg.walk]);
    let rS = shelterCache.get(sKey);
    if (!rS) { rS = dijkstra(scene, veto, cm.time, cm.stepLen, shelters.map(h => idxOf(scene, h)), { reverse: true, quantum: cm.quanta.time }).dist; if (shelterCache.size > 6) shelterCache.clear(); shelterCache.set(sKey, rS); }
    hf = { havens, rH, rS, shelterCount: shelters.length };
  }
  let maxT = 0, maxTS = 0, uncovered = 0;
  for (const p of pts) {
    const tm = hf.rH[p.idx] >= INF ? Infinity : hf.rH[p.idx] / 60; p.timeToHavenMin = tm; if (tm > maxT) maxT = tm; if (tm > cfg.haven.maxMinutes) uncovered++;
    const ts = hf.rS[p.idx] >= INF ? Infinity : hf.rS[p.idx] / 60; p.timeToShelterMin = ts; if (ts > maxTS) maxTS = ts;
  }
  return { havens: hf.havens, maxT, maxTS, uncoveredPct: 100 * uncovered / pts.length, shelterCount: hf.shelterCount, fields: hf };
}

function scoreRoute(cfg: PlannerConfig, pts: RoutePoint[], visited: POI[], vTarget: number) {
  let sMin = 100, sSum = 0, cMin = 100, cSum = 0;
  for (const p of pts) { sMin = Math.min(sMin, p.S); sSum += p.S; cMin = Math.min(cMin, p.C); cSum += p.C; }
  const S = sMin <= 0 ? 0 : cfg.route.sMinWeight * sMin + (1 - cfg.route.sMinWeight) * sSum / pts.length;
  const V = Math.min(100, visited.reduce((a, p) => a + p.value, 0) / Math.max(vTarget, 1) * 100);
  const C = cfg.route.cMinWeight * cMin + (1 - cfg.route.cMinWeight) * cSum / pts.length;
  return { S, V, C, U: cfg.route.uSafety * S + cfg.route.uScience * V, Smin: sMin, Cmin: cMin, lowConfidence: C < cfg.route.lowConfidence };
}

function jaccard(W: number, H: number, a: number[], b: number[], rCells: number) {
  const ma = new Uint8Array(W * H), mb = new Uint8Array(W * H);
  for (const i of a) ma[i] = 1; for (const i of b) mb[i] = 1;
  const da = distanceTransform(W, H, ma), db = distanceTransform(W, H, mb);
  let inter = 0, uni = 0;
  for (let i = 0; i < W * H; i++) { const A = da[i] <= rCells, B = db[i] <= rCells; if (A && B) inter++; if (A || B) uni++; }
  return uni ? inter / uni : 0;
}

/** Straight-line baseline through the same waypoint order, evaluated on the same fields. */
function straightLine(scene: SceneData, f: Fields, cm: CostModel, seq: number[]): StraightLineEval {
  const { W, cell_dx, cell_dy } = scene.meta;
  let distM = 0, vetoCells = 0, minS = 100, sSum = 0, cnt = 0, o2 = 0;
  for (let k = 1; k < seq.length; k++) {
    const a = seq[k - 1], b = seq[k], ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0, n = Math.max(1, Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
    let prev = a;
    for (let s = 1; s <= n; s++) {
      const x = Math.round(ax + (bx - ax) * s / n), y = Math.round(ay + (by - ay) * s / n), i = y * W + x;
      if (i === prev) continue;
      const d = Math.hypot(((i % W) - (prev % W)) * cell_dx, (((i / W) | 0) - ((prev / W) | 0)) * cell_dy);
      distM += d; o2 += cm.o2(prev, i, d); if (f.veto[i]) vetoCells++; minS = Math.min(minS, f.S[i]); sSum += f.S[i]; cnt++; prev = i;
    }
  }
  return { distM, vetoCells, minS, meanS: cnt ? sSum / cnt : 0, o2Kg: o2 };
}

/** Scan LTST 06–18 for route A: shade %, temperature risk, dust-devil window → recommended start. */
function evaWindow(scene: SceneData, cfg: PlannerConfig, env: EnvState, pts: RoutePoint[]): { hours: EvaWindowHour[]; recommendedStart: number | null } {
  const latC = (scene.meta.lat0 + scene.meta.lat1) / 2, hours: EvaWindowHour[] = [];
  const sample = pts.filter((_, i) => i % 5 === 0);
  const durH = Math.max(1, (pts[pts.length - 1].tMin - pts[0].tMin) / 60);
  for (let h = 6; h <= 18; h += 0.5) {
    const el = sunElevation(h, latC, env.ls), az = sunAzimuth(h, latC, env.ls), tAir = env.airTempC ?? airTempC(h);
    let shade = 0, tRisk = 0;
    for (const p of sample) {
      const sh = el <= 0 ? 1 : (horizonAt(scene, p.idx, az) > el ? 1 : 0); shade += sh;
      const t = tAir + (sh ? -10 : 15 * Math.max(0, Math.sin(el * Math.PI / 180)));
      tRisk += t < cfg.temperature.comfortLo ? Math.min(100, (Math.abs(t) - 20) / cfg.temperature.coldSpan * 100) : t > cfg.temperature.comfortHi ? Math.min(100, (t - 20) / cfg.temperature.hotSpan * 100) : 0;
    }
    const shadePct = 100 * shade / sample.length, tr = tRisk / sample.length, dd = h >= 11 && h < 14;
    const score = 100 - 0.5 * tr - 0.3 * shadePct - (dd ? 40 : 0) - (el < 10 ? 30 : 0);
    hours.push({ ltst: h, shadePct, tRisk: tr, dustDevil: dd, sunEl: el, score });
  }
  let best: number | null = null, bs = -Infinity;
  for (const hh of hours) {
    if (hh.ltst + durH > 16) break;   // finish at least 2 h before sunset (contingency daylight reserve)
    const win = hours.filter(w => w.ltst >= hh.ltst && w.ltst <= hh.ltst + durH);
    const ms = win.reduce((a, w) => a + w.score, 0) / win.length;
    if (ms > bs) { bs = ms; best = hh.ltst; }
  }
  return { hours, recommendedStart: best };
}

export function plan(scene: SceneData, cfgIn: PlannerConfig, reqIn: PlanRequest, allPois: POI[]): PlanResult {
  let cfg = cfgIn, req = reqIn;
  const t0 = performance.now(), timing: Record<string, number> = {}, explain: string[] = [];
  const { W, H } = scene.meta, n = W * H, env = req.env;
  const lap = (k: string, s: number) => { timing[k] = Math.round(performance.now() - s); };
  const poiMap = new Map(allPois.map(p => [p.id, p]));
  const sep = env.sep;
  if (sep) {
    cfg = { ...cfg, safety: { ...cfg.safety, R: cfg.safety.R * 3 } };
    req = { ...req, mode: 'rtb', targets: [], wantPlanB: false };
    explain.push('SEP uyarısı: keşif iptal. Bilim ödülü sıfır (w_v=0), radyasyon ağırlığı ×3; mevcut konumdan en yakın GERÇEK sığınağa (habitat/rover) rota.');
  }

  let s = performance.now();
  // the emergency return field depends only on base, veto inputs and the emergency cost model → cache it
  const retKey = JSON.stringify([scene.meta.id, req.baseIdx, cfg.safety, cfg.veto, cfg.o2, cfg.radiation, cfg.temperature, env.ltst, env.ls, env.airTempC, env.sep, env.sampleKg, env.injured, env.suitLeak, env.elapsedH, env.tau]);
  let cached = retCache.get(retKey);
  if (!cached) {
    const f0 = computeFields(scene, cfg, env, req.baseIdx, allPois, null, req.o2BudgetKg, true);
    const cmRtb = makeCostModel(scene, cfg, f0, env, { mode: 'rtb', sampleKg: env.sampleKg, hoursIn: env.elapsedH });
    cached = { veto0: f0.veto, o2Ret: dijkstra(scene, f0.veto, cmRtb.o2, cmRtb.stepLen, [req.baseIdx], { reverse: true, quantum: cmRtb.quanta.o2 }).dist };
    if (retCache.size > 6) retCache.clear();
    retCache.set(retKey, cached);
  } else explain.push('Dönüş-O₂ alanı önbellekten.');
  const o2Ret = cached.o2Ret;
  const f = computeFields(scene, cfg, env, req.baseIdx, allPois, o2Ret, req.o2BudgetKg, req.mode === 'rtb' || sep);
  lap('fields', s);
  explain.push(`Güneş: azimut ${f.sunAz.toFixed(0)}°, yükseklik ${f.sunEl.toFixed(0)}° (LTST ${env.ltst.toFixed(1)}, Ls ${env.ls.toFixed(0)}°); hava ${f.tAir.toFixed(0)} °C; gölge %${(100 * f.shade.reduce((a, b) => a + b, 0) / n).toFixed(1)}; üs ile görüş hattı dışı %${(100 * (1 - f.comm.reduce((a, b) => a + b, 0) / n)).toFixed(1)}.`);
  let vetoPct = 0; for (let i = 0; i < n; i++) vetoPct += f.veto[i]; vetoPct = 100 * vetoPct / n;
  explain.push(`Veto hücreleri %${vetoPct.toFixed(1)}: eğim>${cfg.veto.E}°, kaya>%${cfg.veto.K}, zemin>${cfg.veto.Z}${sep ? '' : `, R>${cfg.veto.R}`}, T>${cfg.veto.T}.`);

  const baseIdx = snap(scene, f.veto, req.baseIdx) ?? req.baseIdx;
  const startIdx = snap(scene, f.veto, req.startIdx ?? baseIdx) ?? baseIdx;
  const roverIdx = req.roverIdx != null ? snap(scene, f.veto, req.roverIdx) : null;
  const targets = req.targets.map(p => ({ poi: p, idx: snap(scene, f.veto, idxOf(scene, p)) })).filter(t => t.idx >= 0);
  const cmFor = (kg: number) => makeCostModel(scene, cfg, f, env, { mode: req.mode, sampleKg: kg, hoursIn: env.elapsedH });
  const cm = cmFor(env.sampleKg);
  const cPoi = (idx: number) => f.C[idx];
  const o2Used = req.o2UsedKg ?? 0, minutesUsed = req.minutesUsed ?? 0;
  explain.push(`Başlangıç: ${startIdx === baseIdx ? 'habitat' : `mevcut konum (${startIdx % W}, ${(startIdx / W) | 0})`}; harcanan O₂ ${o2Used.toFixed(3)} kg, geçen ${minutesUsed.toFixed(0)} dk; hedef ${targets.length}; rover ${roverIdx != null ? 'var' : 'yok'}.`);

  s = performance.now();
  const routes: RouteResult[] = [];
  const vTarget = Math.max(1, req.targets.reduce((a, p) => a + p.value, 0));
  let legs: Leg[] = [], order: string[] = [], nodes: Node[] = [], skipped: PlanResult['skipped'] = [];
  let shelterCountdownMin: number | null = null;
  if (sep) {
    const cand = [{ id: 'BASE', idx: baseIdx }, ...(roverIdx != null && !env.roverLost ? [{ id: 'ROVER', idx: roverIdx }] : [])];
    let best: { id: string; path: number[]; t: number } | null = null;
    for (const c of cand) {
      if (c.idx === startIdx) { best = { id: c.id, path: [startIdx], t: 0 }; break; }
      const r = astar(scene, f.veto, cm, startIdx, c.idx); if (!r) continue;
      const pc = pathCosts(scene, cm, r.path);
      if (!best || pc.tMin < best.t) best = { id: c.id, path: r.path, t: pc.tMin };
    }
    if (best && best.path.length > 1) { legs = [{ from: 'START', to: best.id, path: best.path, planCost: 0 }]; shelterCountdownMin = best.t; nodes = [{ id: 'START', idx: startIdx, poi: null }, { id: best.id, idx: best.path[best.path.length - 1], poi: null }]; }
    else if (best) shelterCountdownMin = 0;
    explain.push(best ? `Sığınağa süre: ${best.t.toFixed(1)} dk (${best.id === 'ROVER' ? 'rover' : 'habitat'}).` : 'Hiçbir sığınağa veto dışı yol yok!');
  } else {
    let r: ReturnType<typeof orienteer> | null = null;
    if (targets.length >= 2) {
      const c = coarsen(scene, f, f.veto);
      const ccm = makeCostModel(c.cscene, cfg, c.cf, env, { mode: req.mode, sampleKg: env.sampleKg, hoursIn: env.elapsedH });
      const fineIdx = new Map<number, number>();
      const ct = targets.map(t => { const ci = c.toCoarse(t.idx); fineIdx.set(ci, t.idx); return { poi: t.poi, idx: ci }; });
      const cs = c.toCoarse(startIdx), cb = c.toCoarse(baseIdx); fineIdx.set(cs, startIdx); fineIdx.set(cb, baseIdx);
      r = orienteer(c.cscene, cfg, c.cv, ccm, cs, cb, ct, req.o2BudgetKg - o2Used, req.maxMinutes - minutesUsed, ci => cPoi(fineIdx.get(ci) ?? 0), explain,
        { scene, veto: f.veto, cm, map: ci => fineIdx.get(ci) ?? ci });
      if (r.order.length && !r.legs.length) { explain.push('Kaba ızgara sıralaması ince ızgarada çözülemedi; tam çözünürlükte yeniden.'); r = null; } else explain.push('Sıralama 2 m kaba ızgarada (veto muhafazakâr), bacaklar 1 m tam çözünürlükte A*.');
    }
    if (!r) r = orienteer(scene, cfg, f.veto, cm, startIdx, baseIdx, targets, req.o2BudgetKg - o2Used, req.maxMinutes - minutesUsed, cPoi, explain);
    legs = r.legs; order = r.order; nodes = r.nodes; skipped = r.skipped;
    if (!targets.length && startIdx !== baseIdx) { const a = astar(scene, f.veto, cm, startIdx, baseIdx); if (a) legs = [{ from: 'START', to: 'BASE', path: a.path, planCost: a.cost }]; }
  }
  lap('orienteering', s);

  let havenFieldsA: HavenFields | undefined;
  const finish = (id: 'A' | 'B', label: string, lg: Leg[], ord: string[], presetHavens?: HavenFields): RouteResult => {
    const { pts, legStats } = buildPoints(scene, cfg, f, env, lg, poiMap, cmFor, o2Ret, req.o2BudgetKg, o2Used, minutesUsed);
    const visited = ord.map(i => poiMap.get(i)!).filter(Boolean);
    const score = scoreRoute(cfg, pts, visited, vTarget);
    let ponr: number | null = null; for (let i = 0; i < pts.length; i++) if (pts[i].margin < 0) { ponr = i; break; }
    const corridor = corridorMask(scene, f.veto, pts, cfg);
    const hv = pickHavens(scene, cfg, f, f.veto, cmFor(0), pts, baseIdx, roverIdx, env, presetHavens);
    if (id === 'A') havenFieldsA = hv.fields;
    const last = pts[pts.length - 1];
    let mm = pts[0]; for (const p of pts) if (p.margin < mm.margin) mm = p;
    const minMargin = { kg: mm.margin, min: mm.margin / cfg.o2.nominalKgPerH * 60, atM: mm.distM };
    let losLoss = 0; for (const p of pts) if (!p.buddyLos) losLoss++;
    const warnings: string[] = [];
    if (ponr !== null) warnings.push(`Dönüşü olmayan nokta: ${pts[ponr].distM.toFixed(0)} m'de O₂ rezervi (1.2× dönüş) ihlal → acil dönüş`);
    if (score.lowConfidence) warnings.push(`Düşük veri güveni: C_rota ${score.C.toFixed(0)} < ${cfg.route.lowConfidence}`);
    if (hv.uncoveredPct > 0) warnings.push(`Rotanın %${hv.uncoveredPct.toFixed(0)}'i bekleme noktasına ${cfg.haven.maxMinutes} dk'dan uzak`);
    if (last.tMin > req.maxMinutes) warnings.push(`Süre bütçesi aşıldı: ${last.tMin.toFixed(0)} > ${req.maxMinutes} dk`);
    if (last.waterKg > req.waterBudgetKg) warnings.push(`Soğutma suyu yetersiz: ${last.waterKg.toFixed(2)} > ${req.waterBudgetKg} kg`);
    if (env.buddy && losLoss / pts.length > 0.1) warnings.push(`Eş astronot görüş hattı rotanın %${(100 * losLoss / pts.length).toFixed(0)}'inde kopuk`);
    const worst = pts.reduce((a, p) => p.S < a.S ? p : a, pts[0]);
    const low50 = pts.filter(p => p.S < 50).length;
    const why = [
      `En düşük güvenlik ${worst.S.toFixed(0)}, ${worst.distM.toFixed(0)} m'de (${CLASS_TR[worst.cls]}, eğim ${worst.slopeDeg}°); S<50 hücre sayısı ${low50} / ${pts.length}.`,
      `Walk-back marjı en dar ${mm.distM.toFixed(0)} m'de: ${mm.margin >= 0 ? '+' : ''}${mm.margin.toFixed(3)} kg O₂ (≈ ${(mm.margin / cfg.o2.nominalKgPerH * 60).toFixed(0)} dk nominal tüketim).`,
      `Gerçek sığınağa (habitat/rover) en uzak nokta ${Number.isFinite(hv.maxTS) ? hv.maxTS.toFixed(0) : '∞'} dk; ${hv.havens.length - hv.shelterCount} bekleme noktası ${cfg.haven.maxMinutes} dk içinde.`,
    ];
    return { id, label, points: pts, order: ord, legs: legStats, score,
      totals: { distM: last.distM, tMin: last.tMin - pts[0].tMin, o2Kg: last.o2Kg - o2Used, waterKg: last.waterKg, returnO2Kg: 0 },
      pointOfNoReturn: ponr, corridor, havens: hv.havens, maxTimeToHavenMin: hv.maxT, uncoveredPct: hv.uncoveredPct, warnings, why,
      minMargin, maxTimeToShelterMin: hv.maxTS, buddyLosLossPct: 100 * losLoss / pts.length };
  };

  let straight: StraightLineEval | null = null;
  let window: PlanResult['window'] = { hours: [], recommendedStart: null };
  if (legs.length) {
    s = performance.now();
    const A = finish('A', sep ? 'Sığınak rotası' : 'Birincil rota', legs, order);
    routes.push(A);
    const seq = [legs[0].path[0], ...legs.map(l => l.path[l.path.length - 1])];
    straight = straightLine(scene, f, cm, seq);
    straight.o2Kg += order.reduce((a, id) => a + ((poiMap.get(id)?.dwellMin ?? 15) / 60) * cfg.o2.nominalKgPerH, 0); // same dwell time as A
    if (!sep) window = evaWindow(scene, cfg, env, A.points);
    lap('routeA', s);
    explain.push(`Rota A: ${A.totals.distM.toFixed(0)} m, ${A.totals.tMin.toFixed(0)} dk, O₂ ${A.totals.o2Kg.toFixed(3)} kg; S_rota ${A.score.S.toFixed(0)} (min ${A.score.Smin.toFixed(0)}), V ${A.score.V.toFixed(0)}, C ${A.score.C.toFixed(0)}, U ${A.score.U.toFixed(0)}. Düz çizgi: ${straight.distM.toFixed(0)} m, ${straight.vetoCells} veto hücresi, min S ${straight.minS.toFixed(0)}.`);

    if (req.wantPlanB) {
      s = performance.now();
      const cellM = (scene.meta.cell_dx + scene.meta.cell_dy) / 2;
      const seeds = new Uint8Array(n); for (const p of A.points) seeds[p.idx] = 1;
      const dt = distanceTransform(W, H, seeds);
      const R = cfg.planB.bufferM / cellM, endEx = cfg.planB.endExemptM / cellM;
      const ends = [A.points[0].idx, ...targets.map(t => t.idx), baseIdx];
      let weakest = A.points[0]; for (const p of A.points) if (p.S < weakest.S) weakest = p;
      const vetoB = new Uint8Array(f.veto), wr = 12 / cellM;
      for (let y = Math.max(0, weakest.y - wr); y <= Math.min(H - 1, weakest.y + wr); y++) for (let x = Math.max(0, weakest.x - wr); x <= Math.min(W - 1, weakest.x + wr); x++) {
        if (Math.hypot(x - weakest.x, y - weakest.y) <= wr && !ends.some(e => Math.hypot((e % W) - x, ((e / W) | 0) - y) < endEx)) vetoB[(y | 0) * W + (x | 0)] = 1;
      }
      let k = cfg.planB.penalty, legsB: Leg[] | null = null, overlap = 1;
      for (let it = 0; it < 3; it++) {
        const pen = new Float32Array(n);
        for (let i = 0; i < n; i++) { const x = i % W, y = (i / W) | 0; const nearEnd = ends.some(e => Math.hypot((e % W) - x, ((e / W) | 0) - y) < endEx); pen[i] = nearEnd ? 1 : 1 + (k - 1) * Math.max(0, 1 - dt[i] / R); }
        const cmB = makeCostModel(scene, cfg, f, env, { mode: req.mode, sampleKg: env.sampleKg, hoursIn: env.elapsedH, penalty: pen });
        legsB = legsWithAstar(scene, vetoB, cmB, nodes, order) ?? legsWithAstar(scene, f.veto, cmB, nodes, order);
        if (!legsB) break;
        overlap = jaccard(W, H, A.points.map(p => p.idx), legsB.flatMap(l => l.path), 3 / cellM);
        if (overlap <= cfg.planB.maxOverlap) break;
        k *= 2;
      }
      if (legsB && legsB.length) {
        const B = finish('B', 'B planı', legsB, order, havenFieldsA);
        B.diversity = overlap;
        const ratio = B.totals.o2Kg / Math.max(1e-6, A.totals.o2Kg);
        if (ratio > cfg.planB.maxCostRatio) B.warnings.push(`B planı O₂ maliyeti A'nın ${ratio.toFixed(2)} katı`);
        if (overlap > cfg.planB.maxOverlap) B.warnings.push(`Anlamlı alternatif yok (örtüşme %${(100 * overlap).toFixed(0)})`);
        routes.push(B);
        explain.push(`Rota B: A'nın en zayıf halkası (S=${weakest.S.toFixed(0)}, ${weakest.distM.toFixed(0)} m) 12 m yarıçapla vetolandı; A'nın ${cfg.planB.bufferM} m tamponunda maliyet ×${k}; örtüşme %${(100 * overlap).toFixed(0)}.`);
      }
      lap('routeB', s);
    }
  } else explain.push(sep ? 'Sığınak rotası üretilemedi.' : 'Hiçbir hedefe güvenli yol bulunamadı; vetolar veya bütçe çok kısıtlayıcı.');

  const q = (a: Float32Array) => { const o = new Uint8Array(n); for (let i = 0; i < n; i++) o[i] = Math.max(0, Math.min(255, Math.round(a[i]))); return o; };
  timing.total = Math.round(performance.now() - t0);
  // comm comes from a cache inside the worker: copy it, because the main thread receives these buffers by transfer
  return { routes, fields: { S: q(f.S), V: q(f.V), C: q(f.C), veto: f.veto, shade: f.shade, comm: f.comm.slice(), o2Ret: o2Ret.slice() }, skipped, timingMs: timing, explain, straight, window, shelterCountdownMin };
}
