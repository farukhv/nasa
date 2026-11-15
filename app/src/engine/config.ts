/**
 * Single source of truth: every weight, coefficient and threshold of the planner.
 * Each value carries an origin tag: S = sourced, D = derived from a sourced formula, A = assumption (tunable).
 * The sources themselves are listed in WHY below and shown in the interface next to the value.
 */

export type Provenance = 'Observed' | 'Derived' | 'Modelled' | 'Assumed';

export interface SafetyWeights { K: number; E: number; Z: number; R: number; O: number; T: number; shade: number; comm: number }
export interface ScienceWeights { G: number; DK: number; F: number; N: number; H: number }
export interface ConfidenceWeights { Q: number; DV: number; M: number; P: number; LK: number }

export interface PlannerConfig {
  // --- cell safety score S_i = 100 − Σ w·risk − 5·shade − 10·no-comms  [S: team specification]
  safety: SafetyWeights;
  // --- science value V_i
  science: ScienceWeights;
  // --- model confidence C_i
  confidence: ConfidenceWeights;
  shadeQualityPenalty: number;          // Q_effective = Q − 15·shade
  // --- hard no-go thresholds [S: team specification]
  veto: { E: number; K: number; Z: number; R: number; T: number };
  // --- path cost: Cost = w_d·ΔO + w_s·(100−S_j) + w_v·(1 − V_j/100)·100  (never a negative reward)
  cost: { wd: number; ws: number; wv: number };
  // --- oxygen and physiology
  o2: {
    baseKgPerKm: number;      // 0.033 kg/km on level ground, 3.3 km/h at 1440 BTU/h [D: Apollo walk-back rule]
    nominalKgPerH: number;    // 0.09 [D: 1200 BTU/h]
    hardKgPerH: number;       // 0.15 [D: 2000 BTU/h]
    emergencyKgPerH: number;  // 0.18 upper bound
    tankKg: number;           // PLSS primary O₂, about 0.6–0.9 kg usable (xEMU 8 h × 0.09) [A]
    reserveFactor: number;    // 1.20: O_remaining ≥ 1.2·O_return [S: team specification]
    alphaUp: number;          // f = 1 + 3.5·tanθ uphill [D: Minetti 2002 scaled to 0.38 g]
    alphaDown: number;        // f = 1 + 1.0·|tanθ| downhill
    downBreakDeg: number;     // extra cost beyond −10 % (about 5.7°)
    betaByClass: number[];    // ground resistance β: soil, bedrock, rocky, boulders, sand, crater rim [S: Lejeune 1998]
    gammaPerKg: number;       // 0.006 per kg of carried samples [D]
    fatigueStartH: number;    // +5 %/h after 4 h [A]
    fatiguePerH: number;
    injuredSpeedFactor: number; // 0.5 [A]
    maxSampleKg: number;      // 20 kg on a walking EVA [S: Apollo]
  };
  water: { kgPerHPerW: number; tankKg: number; basalW: number; wPerKgO2PerH: number }; // 0.00127 kg/h/W [D: 2.83 MJ/kg]
  walk: { toblerSuitFactor: number; maxKmH: number; walkbackKmH: number };            // Tobler × 0.6, capped at 4, walk-back 3.3 [S/A]
  nav: { r0m: number; pdrFrac: number; imuA: number; maxCorridorM: number; minCorridorM: number; corridorSafetyM: number };
  haven: { maxMinutes: number; minCount: number; maxCount: number; minS: number; maxSlopeDeg: number };
  planB: { bufferM: number; penalty: number; endExemptM: number; maxOverlap: number; maxCostRatio: number };
  dust: { scaleHeightM: number; solarK: number };
  radiation: { baseOpen: number; sepBoost: number; svfDoseSlope: number };
  temperature: { comfortLo: number; comfortHi: number; coldSpan: number; hotSpan: number };
  route: { sMinWeight: number; cMinWeight: number; uSafety: number; uScience: number; lowConfidence: number; vTarget: number };
}

export const DEFAULT_CONFIG: PlannerConfig = {
  safety: { K: 0.25, E: 0.20, Z: 0.20, R: 0.10, O: 0.15, T: 0.10, shade: 5, comm: 10 },
  science: { G: 0.30, DK: 0.20, F: 0.25, N: 0.15, H: 0.10 },
  confidence: { Q: 0.25, DV: 0.25, M: 0.20, P: 0.20, LK: 0.10 },
  shadeQualityPenalty: 15,
  veto: { E: 25, K: 40, Z: 85, R: 80, T: 90 },
  cost: { wd: 1.0, ws: 0.70, wv: 0.30 },
  o2: {
    baseKgPerKm: 0.033, nominalKgPerH: 0.09, hardKgPerH: 0.15, emergencyKgPerH: 0.18,
    tankKg: 0.72, reserveFactor: 1.2,
    alphaUp: 3.5, alphaDown: 1.0, downBreakDeg: 5.7,
    betaByClass: [0.10, 0.05, 0.30, 0.45, 0.80, 0.50],
    gammaPerKg: 0.006, fatigueStartH: 4, fatiguePerH: 0.05, injuredSpeedFactor: 0.5, maxSampleKg: 20,
  },
  water: { kgPerHPerW: 0.00127, tankKg: 3.9, basalW: 100, wPerKgO2PerH: 3300 }, // 0.09 kg/h O₂ ≈ 300 W
  walk: { toblerSuitFactor: 0.6, maxKmH: 4.0, walkbackKmH: 3.3 },
  nav: { r0m: 0.3, pdrFrac: 0.035, imuA: 0.005, maxCorridorM: 25, minCorridorM: 1.5, corridorSafetyM: 5 },
  haven: { maxMinutes: 25, minCount: 3, maxCount: 5, minS: 75, maxSlopeDeg: 10 },
  planB: { bufferM: 20, penalty: 4, endExemptM: 10, maxOverlap: 0.4, maxCostRatio: 1.6 },
  dust: { scaleHeightM: 10500, solarK: 0.35 },
  radiation: { baseOpen: 50, sepBoost: 40, svfDoseSlope: 0.3 },
  temperature: { comfortLo: -20, comfortHi: 20, coldSpan: 100, hotSpan: 25 },
  route: { sMinWeight: 0.6, cMinWeight: 0.5, uSafety: 0.6, uScience: 0.4, lowConfidence: 65, vTarget: 400 },
};

export interface Bilingual { tr: string; en: string }

/** Terrain class tables (0–100): safety penalty and science value. */
export const TERRAIN_CLASSES: { id: number; name: Bilingual; penalty: number; science: number; why: Bilingual }[] = [
  { id: 0, penalty: 5, science: 25, name: { tr: 'Sıkı toprak', en: 'Firm soil' },
    why: { tr: 'En iyi basma zemini; AI4Mars "geçilebilir". iMOST: regolit toz/ISRU için öncelikli.', en: 'Best footing; AI4Mars "traversable". iMOST: regolith is a priority for dust and ISRU studies.' } },
  { id: 1, penalty: 10, science: 90, name: { tr: 'Anakaya', en: 'Bedrock' },
    why: { tr: "Yerinde kaya: katmanlanma, kontak, yaş ilişkileri. Perseverance 30 örneğin 27'si kaya karotu.", en: 'In-place rock: layering, contacts, age relations. 27 of the 30 Perseverance samples are rock cores.' } },
  { id: 2, penalty: 30, science: 50, name: { tr: 'Kayalık (%8–25)', en: 'Rocky (8–25%)' },
    why: { tr: "Golombek: k=%10 → takılma bandı (10–30 cm) alanın ~%3.5'i.", en: 'Golombek: k=10% → the trip band (10–30 cm rocks) covers about 3.5% of the area.' } },
  { id: 3, penalty: 85, science: 65, name: { tr: 'Blok / kaya tarlası', en: 'Boulder field' },
    why: { tr: "k≥%25: >0.3 m kayalar alanın %10+'u; fiilen yürünemez. Çoğu float, bağlam zayıf.", en: 'k≥25%: rocks above 0.3 m cover more than 10% of the area; effectively not walkable. Mostly float rock with weak context.' } },
  { id: 4, penalty: 60, science: 20, name: { tr: 'Kum dalgası', en: 'Sand ripple' },
    why: { tr: 'Spirit "Troy" (2010), Opportunity "Purgatory" (2005): batma. Enerji 1.6–2.5×.', en: 'Spirit "Troy" (2010), Opportunity "Purgatory" (2005): sinkage. Energy cost 1.6–2.5×.' } },
  { id: 5, penalty: 70, science: 75, name: { tr: 'Krater kenarı', en: 'Crater rim' },
    why: { tr: 'Derin malzeme yüzeye çıkmış ama blok ejekta + dik iç duvar.', en: 'Deep material is exposed, but with blocky ejecta and a steep inner wall.' } },
];

export const WHY: Record<string, { label: Bilingual; source: Bilingual; tag: Provenance | 'Spec' }> = {
  'safety.K': { tag: 'Spec', label: { tr: 'Kaya yoğunluğu ağırlığı 0.25', en: 'Rock abundance weight 0.25' }, source: { tr: 'Ekip spesifikasyonu; Golombek & Rapp 1997 takılma bandı analizi', en: 'Team specification; Golombek & Rapp 1997 trip-band analysis' } },
  'safety.E': { tag: 'Spec', label: { tr: 'Eğim ağırlığı 0.20', en: 'Slope weight 0.20' }, source: { tr: "M2020 iniş kriteri ≤15°; Perseverance 15–20°'de kayma", en: 'M2020 landing criterion ≤15°; Perseverance slips at 15–20°' } },
  'safety.Z': { tag: 'Spec', label: { tr: 'Zemin direnci 0.20', en: 'Ground resistance 0.20' }, source: { tr: 'Arvidson 2010 (Troy); Lejeune 1998', en: 'Arvidson 2010 (Troy); Lejeune 1998' } },
  'cost.ws': { tag: 'Assumed', label: { tr: 'Güvenlik : bilim = 70 : 30 (politika)', en: 'Safety : science = 70 : 30 (policy)' },
    source: { tr: 'Leksikografik yapı (önce veto, sonra maliyet) literatürden: Apollo walk-back, BASALT uçuş kuralları (Lim 2019), Desert RATS (Hörz 2013). 70:30 sayısı ayarlanabilir bir politika varsayımıdır.',
      en: 'The lexicographic structure (no-go first, cost second) comes from the literature: Apollo walk-back, BASALT flight rules (Lim 2019), Desert RATS (Hörz 2013). The 70:30 figure is a tunable policy assumption.' } },
  'o2.baseKgPerKm': { tag: 'Derived', label: { tr: '0.033 kg O₂ / km', en: '0.033 kg O₂ / km' }, source: { tr: 'Apollo PLSS 1440 BTU/h @ 3.3 km/h; 20.2 kJ/L, 1.43 g/L', en: 'Apollo PLSS 1440 BTU/h at 3.3 km/h; 20.2 kJ/L, 1.43 g/L' } },
  'o2.alphaUp': { tag: 'Derived', label: { tr: 'Yokuş f = 1 + 3.5·tanθ', en: 'Uphill f = 1 + 3.5·tanθ' }, source: { tr: 'Minetti 2002 (2.85× @ %17.6, 1 g) → 0.38 g ölçeği', en: 'Minetti 2002 (2.85× at 17.6%, 1 g) scaled to 0.38 g' } },
  'o2.gammaPerKg': { tag: 'Derived', label: { tr: 'γ = 0.006 / kg', en: 'γ = 0.006 / kg' }, source: { tr: 'Pandolf 1977 yük terimi; toplam hareketli kütle 140–210 kg', en: 'Pandolf 1977 load term; total moving mass 140–210 kg' } },
  'water.kgPerHPerW': { tag: 'Assumed', label: { tr: '0.00127 kg su / h / W', en: '0.00127 kg water / h / W' }, source: { tr: 'Süblimasyon 2.83 MJ/kg; EMU 3.6 kg/EVA. Mars 6 mbar: teknoloji VARSAYIM', en: 'Sublimation 2.83 MJ/kg; EMU 3.6 kg per EVA. At 6 mbar on Mars the technology is an ASSUMPTION' } },
  'nav.pdrFrac': { tag: 'Derived', label: { tr: 'Konum belirsizliği 3.5 % × mesafe', en: 'Position uncertainty 3.5% × distance' }, source: { tr: 'Foxlin 2005; Woodman 2007; MER güneş bulma 0.5–2°', en: 'Foxlin 2005; Woodman 2007; MER sun finding 0.5–2°' } },
  'haven.maxMinutes': { tag: 'Assumed', label: { tr: 'Sığınağa ≤ 25 dk', en: 'Shelter within 25 min' }, source: { tr: 'SEP uyarı süresi 10–30 dk (Hassler 2018); Artemis EVA planlaması', en: 'SEP warning time 10–30 min (Hassler 2018); Artemis EVA planning' } },
  'radiation.svfDoseSlope': { tag: 'Derived', label: { tr: 'Doz ≈ 1 − 0.3·(1−SVF)', en: 'Dose ≈ 1 − 0.3·(1−SVF)' }, source: { tr: 'Ehresmann 2021: %19 gökyüzü kapanması → %4–8 doz düşüşü', en: 'Ehresmann 2021: 19% sky obstruction → 4–8% lower dose' } },
  'veto.E': { tag: 'Spec', label: { tr: 'Eğim > 25° = duvar', en: 'Slope > 25° = wall' }, source: { tr: 'Perseverance kayma 15–20°; Artemis <20° tercih', en: 'Perseverance slips at 15–20°; Artemis prefers <20°' } },
};
