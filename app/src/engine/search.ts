import type { PlannerConfig } from './config';
import type { SceneData, EnvState } from './types';
import type { Fields } from './fields';
import { DialQueue } from './heap';
import { eta, F_MIN } from './physio';

export const DX = [1, 1, 0, -1, -1, -1, 0, 1];
export const DY = [0, 1, 1, 1, 0, -1, -1, -1];
const INF = 3e38;

export interface CostModel {
  /** planning cost of moving u→v (≥ d·wd·F_MIN) */
  plan(u: number, v: number, d: number): number;
  /** physical oxygen kg for u→v */
  o2(u: number, v: number, d: number): number;
  /** seconds for u→v */
  time(u: number, v: number, d: number): number;
  stepLen(k: number): number;      // metres for neighbour k
  minPlanPerM: number;
  quanta: { plan: number; o2: number; time: number };  // bucket widths for Dial's queue
}

export interface CostOpts { mode: 'explore' | 'rtb'; sampleKg: number; hoursIn: number; penalty?: Float32Array | null; safetyScale?: number }

export function makeCostModel(scene: SceneData, cfg: PlannerConfig, f: Fields, env: EnvState, opts: CostOpts): CostModel {
  const { W, H, cell_dx, cell_dy } = scene.meta, n = W * H, z = scene.elev;
  const betaTab = cfg.o2.betaByClass, cls = f.parts.CLS;
  const etaV = eta(cfg, opts.hoursIn, env);
  const wd = cfg.cost.wd, ws = opts.mode === 'rtb' ? cfg.cost.ws + cfg.cost.wv : cfg.cost.ws, wv = opts.mode === 'rtb' ? 0 : cfg.cost.wv;
  const kS = opts.safetyScale ?? 3.0;
  const diag = Math.hypot(cell_dx, cell_dy);
  const lens = [cell_dx, diag, cell_dy, diag, cell_dx, diag, cell_dy, diag];
  const pen = opts.penalty ?? null;
  // per-cell static terms (computed once per model, not per edge)
  const cellTerm = new Float32Array(n), betaC = new Float32Array(n), o2Mul = new Float32Array(n), speedDiv = new Float32Array(n);
  const loadEta = (1 + cfg.o2.gammaPerKg * opts.sampleKg) * etaV * cfg.o2.baseKgPerKm / 1000;
  for (let i = 0; i < n; i++) {
    const b = betaTab[cls[i]];
    betaC[i] = b;
    cellTerm[i] = (ws * kS * (100 - f.S[i]) / 100 + wv * (1 - f.V[i] / 100)) * (pen ? pen[i] : 1);
    o2Mul[i] = (1 + b) * loadEta;
    speedDiv[i] = 1 + 0.6 * b;
  }
  const alphaUp = cfg.o2.alphaUp, alphaDown = cfg.o2.alphaDown, brk = Math.tan(cfg.o2.downBreakDeg * Math.PI / 180);
  const slopeF = (t: number) => t >= 0 ? 1 + alphaUp * t : (-t <= brk ? Math.max(0.85, 1 + 1.5 * t) : 0.85 + 2.0 * alphaDown * (-t - brk));
  const vmax = cfg.walk.maxKmH, suit = cfg.walk.toblerSuitFactor;
  let vFac = 1; if (env.injured) vFac *= cfg.o2.injuredSpeedFactor; if (env.tau > 3) vFac *= Math.max(0.6, 1 - 0.05 * (env.tau - 3));
  const wdPen = pen ? pen : null;
  return {
    stepLen: k => lens[k],
    minPlanPerM: wd * F_MIN,
    quanta: { plan: 0.02, o2: 0.02 * cfg.o2.baseKgPerKm / 1000, time: 0.02 },
    plan(u, v, d) {
      const t = (z[v] - z[u]) / d;
      const fs = slopeF(t) * (1 + betaC[v] * 0.5);
      return d * (wd * fs * (wdPen ? wdPen[v] : 1) + cellTerm[v]);
    },
    o2(u, v, d) { return d * slopeF((z[v] - z[u]) / d) * o2Mul[v]; },
    time(u, v, d) {
      const t = (z[v] - z[u]) / d;
      let vk = Math.min(vmax, 6 * Math.exp(-3.5 * Math.abs(t + 0.05)) * suit) / speedDiv[v] * vFac;
      if (vk < 0.54) vk = 0.54;              // 0.15 m/s floor
      return d / (vk / 3.6);
    },
  };
}

export interface SearchResult { dist: Float32Array; parent: Int32Array }

/**
 * Dijkstra over non-veto cells. reverse=true accumulates cost of moving INTO the source (cost(v→u)), giving
 * "cost to reach source from every cell" under asymmetric costs. Optional goal set for early exit, optional cutoff.
 */
export function dijkstra(scene: SceneData, veto: Uint8Array, cost: (u: number, v: number, d: number) => number,
  stepLen: (k: number) => number, sources: number[], opts: { reverse?: boolean; goals?: Set<number>; cutoff?: number; quantum?: number } = {}): SearchResult {
  const { W, H } = scene.meta, n = W * H;
  const dist = new Float32Array(n).fill(INF), parent = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  const heap = new DialQueue(opts.quantum ?? 0.02, 1 << 16, Math.max(4096, n >> 2));
  for (const s of sources) { dist[s] = 0; heap.push(s, 0); }
  let remaining = opts.goals ? opts.goals.size : -1;
  const cutoff = opts.cutoff ?? INF;
  const lens = [stepLen(0), stepLen(1), stepLen(2), stepLen(3), stepLen(4), stepLen(5), stepLen(6), stepLen(7)];
  const rev = !!opts.reverse;
  while (heap.size > 0) {
    const u = heap.pop(), du = dist[u];
    if (closed[u]) continue;
    closed[u] = 1;
    if (du > cutoff) break;
    if (opts.goals && opts.goals.has(u) && --remaining === 0) break;
    const ux = u % W, uy = (u / W) | 0;
    for (let k = 0; k < 8; k++) {
      const vx = ux + DX[k], vy = uy + DY[k];
      if (vx < 0 || vy < 0 || vx >= W || vy >= H) continue;
      const v = vy * W + vx;
      if (closed[v] || veto[v]) continue;
      if (k & 1) { // no corner cutting through veto
        if (veto[uy * W + vx] || veto[vy * W + ux]) continue;
      }
      const d = lens[k];
      const nd = du + (rev ? cost(v, u, d) : cost(u, v, d));
      if (nd < dist[v]) { dist[v] = nd; parent[v] = u; heap.push(v, nd); }
    }
  }
  return { dist, parent };
}

/** A* with octile heuristic scaled by the minimum plan cost per metre. Returns path (array of idx) or null. */
export function astar(scene: SceneData, veto: Uint8Array, cm: CostModel, start: number, goal: number): { path: number[]; cost: number } | null {
  const { W, H, cell_dx, cell_dy } = scene.meta, n = W * H;
  const g = new Float32Array(n).fill(INF), parent = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  const heap = new DialQueue(cm.quanta.plan, 1 << 16, Math.max(4096, n >> 3));
  const gx = goal % W, gy = (goal / W) | 0, cmin = Math.min(cell_dx, cell_dy) * cm.minPlanPerM;
  const lens = [cm.stepLen(0), cm.stepLen(1), cm.stepLen(2), cm.stepLen(3), cm.stepLen(4), cm.stepLen(5), cm.stepLen(6), cm.stepLen(7)];
  const h = (i: number) => {
    const dx = Math.abs((i % W) - gx), dy = Math.abs(((i / W) | 0) - gy);
    return cmin * (Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy));
  };
  g[start] = 0; heap.push(start, h(start));
  while (heap.size > 0) {
    const u = heap.pop();
    if (closed[u]) continue;
    closed[u] = 1;
    if (u === goal) break;
    const ux = u % W, uy = (u / W) | 0;
    for (let k = 0; k < 8; k++) {
      const vx = ux + DX[k], vy = uy + DY[k];
      if (vx < 0 || vy < 0 || vx >= W || vy >= H) continue;
      const v = vy * W + vx;
      if (closed[v] || veto[v]) continue;
      if ((k & 1) && (veto[uy * W + vx] || veto[vy * W + ux])) continue;
      const d = lens[k];
      const ng = g[u] + cm.plan(u, v, d);
      if (ng < g[v]) { g[v] = ng; parent[v] = u; heap.push(v, ng + h(v)); }
    }
  }
  if (g[goal] >= INF) return null;
  const path: number[] = []; for (let c = goal; c !== -1; c = parent[c]) path.push(c);
  path.reverse();
  return { path, cost: g[goal] };
}

export function backtrack(parent: Int32Array, from: number): number[] {
  const path: number[] = []; for (let c = from; c !== -1; c = parent[c]) path.push(c);
  return path.reverse();
}

/** Euclidean distance transform (in cells) from a set of seed cells — Felzenszwalb–Huttenlocher 1D passes. */
export function distanceTransform(W: number, H: number, seeds: Uint8Array): Float32Array {
  const INFD = 1e12, f = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) f[i] = seeds[i] ? 0 : INFD;
  const dt1 = (src: Float32Array, n: number, stride: number, off: number, out: Float32Array) => {
    const v = new Int32Array(n), zz = new Float32Array(n + 1); let k = 0; v[0] = 0; zz[0] = -INFD; zz[1] = INFD;
    const F = (q: number) => src[off + q * stride];
    for (let q = 1; q < n; q++) {
      let s = ((F(q) + q * q) - (F(v[k]) + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= zz[k]) { k--; s = ((F(q) + q * q) - (F(v[k]) + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; zz[k] = s; zz[k + 1] = INFD;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (zz[k + 1] < q) k++; out[off + q * stride] = (q - v[k]) * (q - v[k]) + F(v[k]); }
  };
  const tmp = new Float32Array(W * H);
  for (let x = 0; x < W; x++) dt1(f, H, W, x, tmp);
  for (let y = 0; y < H; y++) dt1(tmp, W, 1, y * W, f);
  for (let i = 0; i < f.length; i++) f[i] = Math.sqrt(f[i]);
  return f;
}
