import type { Provenance } from './config';

export interface SceneMeta {
  id: string; name: string; W: number; H: number; cell_dx: number; cell_dy: number; disp_scale: number;
  lat0: number; lat1: number; lon0: number; lon1: number; has_dtm: boolean; sun_az: number; sun_el: number;
  elev_min: number; elev_max: number; craters: number[][]; class_names: string[];
  provenance: Record<string, Provenance>; img_src: string; dtm_src: string; crism_src: string | null;
  rock_anchor?: { k_bg: number; k_hi: number; note: string };
  mask_rect?: number[];
}

export type ChannelName = 'K' | 'E' | 'Z' | 'CLS' | 'SVF' | 'G' | 'DK' | 'F' | 'H' | 'Q' | 'DV' | 'M' | 'P' | 'LK'
  | 'HZ0' | 'HZ1' | 'HZ2' | 'HZ3' | 'HZ4' | 'HZ5' | 'HZ6' | 'HZ7';
export const CHANNELS: ChannelName[] = ['K', 'E', 'Z', 'CLS', 'SVF', 'G', 'DK', 'F', 'H', 'Q', 'DV', 'M', 'P', 'LK',
  'HZ0', 'HZ1', 'HZ2', 'HZ3', 'HZ4', 'HZ5', 'HZ6', 'HZ7'];

export interface SceneData {
  meta: SceneMeta;
  ch: Record<ChannelName, Uint8Array>;
  elev: Float32Array;
}

export interface POI {
  id: string; name: string; x: number; y: number;      // grid coords
  kind: 'science' | 'sample' | 'base' | 'user' | 'haven';
  value: number;          // 0–100 science prize (POI level)
  note?: string; source?: string; dwellMin?: number; sampleKg?: number;
}

export interface EnvState {
  ltst: number;            // local true solar time, hours (6..18 daylight)
  tau: number;             // dust opacity
  sep: boolean;            // solar energetic particle event active
  airTempC: number | null; // override; null = diurnal model
  injured: boolean;        // crewmate injured: speed ×0.5, η×2
  suitLeak: boolean;       // O₂ ×3
  roverLost: boolean;      // rover unavailable (haven weight)
  sampleKg: number;        // carried back on return leg
  elapsedH: number;        // hours into EVA at start of plan
  imuOnly: boolean;        // beacon loss: t² drift model
  ls: number;              // areocentric solar longitude (season) → declination, dust season
  buddy: boolean;          // second astronaut follows 60 s behind; mutual LOS checked
}

export interface PlanRequest {
  baseIdx: number;
  startIdx?: number;       // current astronaut position (replanning mid-EVA); default = base
  roverIdx?: number | null;// pressurised rover position (real shelter); null = none
  o2UsedKg?: number;       // consumed before start (mid-EVA replanning)
  minutesUsed?: number;
  targets: POI[];          // science/sample POIs to visit (ordering solved by orienteering)
  o2BudgetKg: number;
  waterBudgetKg: number;
  maxMinutes: number;
  env: EnvState;
  mode: 'explore' | 'rtb';
  wantPlanB: boolean;
}

export interface RoutePoint { idx: number; x: number; y: number; distM: number; tMin: number; o2Kg: number; waterKg: number;
  S: number; V: number; C: number; elev: number; slopeDeg: number; cls: number; shade: number; comm: number;
  o2Ret: number; margin: number; rUnc: number; timeToHavenMin: number; timeToShelterMin: number; buddyLos: number }

export interface RouteResult {
  id: 'A' | 'B';
  label: string;
  points: RoutePoint[];
  order: string[];          // POI ids in visit order
  legs: { from: string; to: string; distM: number; tMin: number; o2Kg: number }[];
  score: { S: number; V: number; C: number; U: number; Smin: number; Cmin: number; lowConfidence: boolean };
  totals: { distM: number; tMin: number; o2Kg: number; waterKg: number; returnO2Kg: number };
  pointOfNoReturn: number | null;  // index of first walk-back violation
  corridor: { mask: Uint8Array; maxR: number };  // grid mask 0/1
  havens: POI[];
  maxTimeToHavenMin: number;
  uncoveredPct: number;
  diversity?: number;        // Jaccard overlap with A (for B)
  warnings: string[];
  why: string[];             // plain-language justification (3 sentences)
  minMargin: { kg: number; min: number; atM: number };
  maxTimeToShelterMin: number;
  buddyLosLossPct: number;
}
export interface StraightLineEval { distM: number; vetoCells: number; minS: number; meanS: number; o2Kg: number }
export interface EvaWindowHour { ltst: number; shadePct: number; tRisk: number; dustDevil: boolean; sunEl: number; score: number }

export interface PlanResult {
  routes: RouteResult[];
  fields: { S: Uint8Array; V: Uint8Array; C: Uint8Array; veto: Uint8Array; shade: Uint8Array; comm: Uint8Array; o2Ret: Float32Array };
  skipped: { id: string; reason: string }[];
  timingMs: Record<string, number>;
  explain: string[];
  straight: StraightLineEval | null;
  window: { hours: EvaWindowHour[]; recommendedStart: number | null };
  shelterCountdownMin: number | null;   // SEP: time from current position to nearest real shelter
}
