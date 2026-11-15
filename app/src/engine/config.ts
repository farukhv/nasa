/**
 * Tek doğruluk kaynağı: tüm ağırlıklar, katsayılar ve eşikler.
 * Her değerin yanında köken etiketi: K = kaynaklı, T = kaynaklı formülden türetilmiş, V = varsayım (ayarlanabilir).
 * Kaynaklar docs/ARA-RAPOR-1-gereksinim-ve-arastirma.md §2–3'te.
 */

export type Provenance = 'Observed' | 'Derived' | 'Modelled' | 'Assumed';

export interface SafetyWeights { K: number; E: number; Z: number; R: number; O: number; T: number; shade: number; comm: number }
export interface ScienceWeights { G: number; DK: number; F: number; N: number; H: number }
export interface ConfidenceWeights { Q: number; DV: number; M: number; P: number; LK: number }

export interface PlannerConfig {
  // --- hücre güvenlik puanı S_i = 100 − Σ w·risk − 5·gölge − 10·kopuk  (ekip V2 formülü) [K: ekip spesifikasyonu]
  safety: SafetyWeights;
  // --- bilimsel değer V_i
  science: ScienceWeights;
  // --- model güveni C_i
  confidence: ConfidenceWeights;
  shadeQualityPenalty: number;          // Q_etkin = Q − 15·gölge
  // --- sert veto eşikleri (ekip V2) [K]
  veto: { E: number; K: number; Z: number; R: number; T: number };
  // --- yol maliyeti: Cost = w_d·ΔO + w_s·(100−S_j) + w_v·(1 − V_j/100)·100  (negatif ödül YOK) [algoritma raporu]
  cost: { wd: number; ws: number; wv: number };
  // --- oksijen / fizyoloji
  o2: {
    baseKgPerKm: number;      // 0.033 kg/km düz zemin, 3.3 km/h @1440 BTU/h [T: Apollo walk-back kuralı]
    nominalKgPerH: number;    // 0.09 [T: 1200 BTU/h]
    hardKgPerH: number;       // 0.15 [T: 2000 BTU/h]
    emergencyKgPerH: number;  // 0.18 üst sınır
    tankKg: number;           // PLSS birincil O₂ ~ 0.6–0.9 kg kullanılabilir (xEMU 8 h × 0.09) [V]
    reserveFactor: number;    // 1.20 — O_kalan ≥ 1.2·O_dönüş [K: ekip]
    alphaUp: number;          // f = 1 + 3.5·tanθ yokuş yukarı [T: Minetti 2002 ×0.38 g]
    alphaDown: number;        // f = 1 + 1.0·|tanθ| yokuş aşağı
    downBreakDeg: number;     // −10 % (~5.7°) sonrası ek artış
    betaByClass: number[];    // zemin direnci β: toprak, anakaya, kayalık, blok, kum, krater kenarı [K: Lejeune 1998]
    gammaPerKg: number;       // 0.006 /kg numune yükü [T]
    fatigueStartH: number;    // 4 h sonra +5 %/h [V]
    fatiguePerH: number;
    injuredSpeedFactor: number; // 0.5 [V]
    maxSampleKg: number;      // 20 kg yürüyüş EVA'sı [K: Apollo]
  };
  water: { kgPerHPerW: number; tankKg: number; basalW: number; wPerKgO2PerH: number }; // 0.00127 kg/h/W [T: 2.83 MJ/kg]
  walk: { toblerSuitFactor: number; maxKmH: number; walkbackKmH: number };            // Tobler×0.6, tavan 4, walk-back 3.3 [K/V]
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

/** Arazi sınıfı tabloları (0–100). Güvenlik cezası & bilimsel değer — ARA-RAPOR-1 §2.2 */
export const TERRAIN_CLASSES = [
  { id: 0, name: 'Sıkı toprak',        penalty: 5,  science: 25, why: 'En iyi basma zemini; AI4Mars "geçilebilir". iMOST: regolit toz/ISRU için öncelikli.' },
  { id: 1, name: 'Anakaya',            penalty: 10, science: 90, why: 'Yerinde kaya: katmanlanma, kontak, yaş ilişkileri. Perseverance 30 örneğin 27\'si kaya karotu.' },
  { id: 2, name: 'Kayalık (%8–25)',    penalty: 30, science: 50, why: 'Golombek: k=%10 → takılma bandı (10–30 cm) alanın ~%3.5\'i.' },
  { id: 3, name: 'Blok / kaya tarlası',penalty: 85, science: 65, why: 'k≥%25: >0.3 m kayalar alanın %10+\'u; fiilen yürünemez. Çoğu float, bağlam zayıf.' },
  { id: 4, name: 'Kum dalgası',        penalty: 60, science: 20, why: 'Spirit "Troy" (2010), Opportunity "Purgatory" (2005): batma. Enerji 1.6–2.5×.' },
  { id: 5, name: 'Krater kenarı',      penalty: 70, science: 75, why: 'Derin malzeme yüzeye çıkmış ama blok ejekta + dik iç duvar.' },
];

export const WHY: Record<string, { label: string; source: string; tag: Provenance | 'Spec' }> = {
  'safety.K': { label: 'Kaya yoğunluğu ağırlığı 0.25', source: 'Ekip V2; Golombek & Rapp 1997 takılma bandı analizi', tag: 'Spec' },
  'safety.E': { label: 'Eğim ağırlığı 0.20', source: 'M2020 iniş kriteri ≤15°; Perseverance 15–20°\'de kayma', tag: 'Spec' },
  'safety.Z': { label: 'Zemin direnci 0.20', source: 'Arvidson 2010 (Troy); Lejeune 1998', tag: 'Spec' },
  'cost.ws': { label: 'Güvenlik : bilim = 70 : 30 (politika)', source: 'Leksikografik yapı (önce veto, sonra maliyet) literatürden: Apollo walk-back, BASALT uçuş kuralları (Lim 2019), Desert RATS (Hörz 2013). 70:30 sayısı ayarlanabilir bir politika varsayımıdır.', tag: 'Assumed' },
  'o2.baseKgPerKm': { label: '0.033 kg O₂ / km', source: 'Apollo PLSS 1440 BTU/h @ 3.3 km/h; 20.2 kJ/L, 1.43 g/L', tag: 'Derived' },
  'o2.alphaUp': { label: 'Yokuş f = 1 + 3.5·tanθ', source: 'Minetti 2002 (2.85× @ %17.6, 1 g) → 0.38 g ölçeği', tag: 'Derived' },
  'o2.gammaPerKg': { label: 'γ = 0.006 / kg', source: 'Pandolf 1977 yük terimi; toplam hareketli kütle 140–210 kg', tag: 'Derived' },
  'water.kgPerHPerW': { label: '0.00127 kg su / h / W', source: 'Süblimasyon 2.83 MJ/kg; EMU 3.6 kg/EVA. Mars 6 mbar: teknoloji VARSAYIM', tag: 'Assumed' },
  'nav.pdrFrac': { label: 'Konum belirsizliği 3.5 % × mesafe', source: 'Foxlin 2005; Woodman 2007; MER güneş bulma 0.5–2°', tag: 'Derived' },
  'haven.maxMinutes': { label: 'Sığınağa ≤ 25 dk', source: 'SEP uyarı süresi 10–30 dk (Hassler 2018); Artemis EVA planlaması', tag: 'Assumed' },
  'radiation.svfDoseSlope': { label: 'Doz ≈ 1 − 0.3·(1−SVF)', source: 'Ehresmann 2021: %19 gökyüzü kapanması → %4–8 doz düşüşü', tag: 'Derived' },
  'veto.E': { label: 'Eğim > 25° = duvar', source: 'Perseverance kayma 15–20°; Artemis <20° tercih', tag: 'Spec' },
};
