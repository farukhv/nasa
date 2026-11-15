import type { PlannerConfig } from './config';
import type { EnvState } from './types';

/** Slope factor on oxygen cost (Minetti-style, 0.38 g scaled, admissible minimum 0.85). */
export function slopeFactor(cfg: PlannerConfig, tanTheta: number): number {
  if (tanTheta >= 0) return 1 + cfg.o2.alphaUp * tanTheta;
  const t = -tanTheta, brk = Math.tan(cfg.o2.downBreakDeg * Math.PI / 180);
  if (t <= brk) return Math.max(0.85, 1 - 1.5 * t);
  return 0.85 + 2.0 * cfg.o2.alphaDown * (t - brk);
}
export const F_MIN = 0.85;

/** Walking speed (m/s): Tobler × suit factor, capped; terrain and injury factors. */
export function speedMs(cfg: PlannerConfig, tanTheta: number, beta: number, env: EnvState): number {
  const tobler = 6 * Math.exp(-3.5 * Math.abs(tanTheta + 0.05)); // km/h
  let v = Math.min(cfg.walk.maxKmH, tobler * cfg.walk.toblerSuitFactor);
  v /= (1 + 0.6 * beta);                 // sand slows as much as it costs
  if (env.injured) v *= cfg.o2.injuredSpeedFactor;
  if (env.tau > 3) v *= Math.max(0.6, 1 - 0.05 * (env.tau - 3)); // visibility/caution
  return Math.max(0.15, v / 3.6);
}

/** Fatigue / effort multiplier η ≥ 1. */
export function eta(cfg: PlannerConfig, hoursIn: number, env: EnvState): number {
  let e = 1 + Math.max(0, hoursIn - cfg.o2.fatigueStartH) * cfg.o2.fatiguePerH;
  if (env.injured) e *= 1.3;
  if (env.suitLeak) e *= 3.0;
  return e;
}

/** Oxygen for one step. d metres, returns kg. */
export function stepO2(cfg: PlannerConfig, dM: number, tanTheta: number, beta: number, sampleKg: number, etaV: number): number {
  return cfg.o2.baseKgPerKm * (dM / 1000) * slopeFactor(cfg, tanTheta) * (1 + beta) * (1 + cfg.o2.gammaPerKg * sampleKg) * etaV;
}

/** Cooling water for a step: metabolic W ≈ O₂ rate × 3300 W/(kg/h) + basal; water = kgPerHPerW × W × hours. */
export function stepWater(cfg: PlannerConfig, o2Kg: number, dtH: number): number {
  const o2RateKgH = dtH > 0 ? o2Kg / dtH : 0;
  const watts = cfg.water.basalW + o2RateKgH * cfg.water.wPerKgO2PerH;
  return cfg.water.kgPerHPerW * watts * dtH;
}

/** Diurnal air temperature model (MEDA/REMS-like): min ≈ −85 °C ~05:00, max ≈ −10 °C ~14:00. */
export function airTempC(ltst: number): number {
  // MEDA/REMS-like asymmetric diurnal curve: min −85 °C at ~05:30, fast rise after sunrise, max −8 °C at ~14:00, slow decay
  const tMin = -85, tMax = -8, h = ((ltst % 24) + 24) % 24;
  if (h >= 5.5 && h <= 14) { const f = Math.sin((Math.PI / 2) * (h - 5.5) / 8.5); return tMin + (tMax - tMin) * f * f; }
  const dt = h > 14 ? h - 14 : h + 10;           // hours since 14:00
  return tMax + (tMin - tMax) * (1 - Math.exp(-dt / 4.5));
}

/** Sun elevation (deg) for equatorial-ish site, simple model: 0 at 06/18, peak at 12 (Ls ignored; tagged Modelled). */
export function declination(lsDeg: number): number { return Math.asin(Math.sin(25.19 * Math.PI / 180) * Math.sin(lsDeg * Math.PI / 180)); }
export function sunElevation(ltst: number, latDeg: number, lsDeg = 180): number {
  const h = (ltst - 12) * 15 * Math.PI / 180, lat = latDeg * Math.PI / 180, dec = declination(lsDeg);
  const sinEl = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h);
  return Math.asin(Math.max(-1, Math.min(1, sinEl))) * 180 / Math.PI;
}
export function sunAzimuth(ltst: number, latDeg: number, lsDeg = 180): number {
  const h = (ltst - 12) * 15 * Math.PI / 180, lat = latDeg * Math.PI / 180, dec = declination(lsDeg);
  const el = sunElevation(ltst, latDeg, lsDeg) * Math.PI / 180;
  const cosAz = (Math.sin(dec) - Math.sin(el) * Math.sin(lat)) / (Math.cos(el) * Math.cos(lat) + 1e-9);
  let az = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI;
  if (h > 0) az = 360 - az;
  return az;
}

/** Dust: Koschmieder visibility and solar flux factor. */
export function dustEffects(cfg: PlannerConfig, tau: number, sunElDeg: number) {
  const beta = tau / cfg.dust.scaleHeightM;
  const visM = 3.912 / Math.max(beta, 1e-9);
  const mu = Math.max(0.1, Math.sin(Math.max(sunElDeg, 1) * Math.PI / 180));
  const solar = Math.exp(-cfg.dust.solarK * Math.max(0, tau - 0.5) / mu);
  return { visM, solar, beta };
}

/** Mars24 (Allison & McEwen 2000): MSD, MTC and LMST for a site at west-longitude lonW, from an Earth Date. */
export function marsClock(date: Date, lonEastDeg: number) {
  const jdUt = date.getTime() / 86400000 + 2440587.5;
  const jdTt = jdUt + 69.184 / 86400;                               // ΔT ≈ 69.2 s (2020s)
  const msd = (jdTt - 2405522.0028779) / 1.0274912517;
  const mtc = (24 * msd) % 24;
  const lonW = (360 - lonEastDeg) % 360;
  const lmst = ((mtc - lonW / 15) % 24 + 24) % 24;
  // Earth–Mars distance: circular-orbit approximation (Earth 1 AU, Mars 1.524 AU, synodic phase)
  const d = (jdTt - 2451545.0);
  const thE = (2 * Math.PI * d / 365.256) % (2 * Math.PI), thM = (2 * Math.PI * (d - 2451545 + 2451545) / 686.98 + 0.9) % (2 * Math.PI);
  const distAu = Math.sqrt(1 + 1.524 ** 2 - 2 * 1.524 * Math.cos(thE - thM));
  const lightMin = distAu * 149597870.7 / 299792.458 / 60;
  return { msd, mtc, lmst, sol: Math.floor(msd), distAu, lightMin };
}
