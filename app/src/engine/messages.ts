/**
 * Planner output text in both interface languages.
 * The engine runs in a Web Worker, so it carries its own small message table instead of the UI dictionary.
 */
import type { Lang } from './types';

type N = string | number;

export interface EngineMessages {
  terrain: string[];
  noSafePath: string;
  skipTime: (min: N) => string;
  skipO2: (kg: N) => string;
  skipOther: string;
  ordering: (targets: N, states: N, chosen: N, o2: N, o2Max: N, t: N, tMax: N, o2Out: N, tOut: N) => string;
  baseName: string; roverName: string; shelterNote: string; shelterMobileNote: string;
  waitName: (k: N) => string;
  waitNote: (s: N, svf: N, slope: N, dose: N) => string;
  sepExplain: string;
  cacheHit: string;
  sun: (az: N, el: N, ltst: N, ls: N, tAir: N, shadePct: N, noLosPct: N) => string;
  veto: (pct: N, v: { E: number; K: number; Z: number; R: number; T: number }, sep: boolean) => string;
  start: (pos: [number, number] | null, o2: N, min: N, targets: N, rover: boolean) => string;
  shelterTime: (min: N, rover: boolean) => string;
  noShelter: string;
  coarseFail: string; coarseOk: string;
  warnNoReturn: (m: N) => string;
  warnLowConfidence: (c: N, limit: N) => string;
  warnUncovered: (pct: N, min: N) => string;
  warnTime: (t: N, max: N) => string;
  warnWater: (kg: N, max: N) => string;
  warnBuddy: (pct: N) => string;
  whySafety: (s: N, m: N, terrain: string, slope: N, low: N, total: N) => string;
  whyMargin: (m: N, kg: string, min: N) => string;
  whyShelter: (min: string, waits: N, limit: N) => string;
  labelShelter: string; labelPrimary: string; labelB: string;
  warnBCost: (ratio: N) => string;
  warnBOverlap: (pct: N) => string;
  routeA: (d: N, t: N, o2: N, s: N, smin: N, v: N, c: N, u: N, sd: N, sv: N, ss: N) => string;
  routeB: (s: N, m: N, buffer: N, k: N, overlap: N) => string;
  failShelter: string; failNone: string;
}

const tr: EngineMessages = {
  terrain: ['sıkı toprak', 'anakaya', 'kayalık', 'kaya tarlası', 'kum dalgası', 'krater kenarı'],
  noSafePath: 'Veto dışı güvenli bir yol yok',
  skipTime: min => `süre bütçesi (${min} dk) yetmiyor`,
  skipO2: kg => `O₂ bütçesi (kullanılabilir ${kg} kg) yetmiyor`,
  skipOther: 'diğer hedeflerle birlikte bütçeye sığmıyor; daha düşük bilim değeri',
  ordering: (targets, states, chosen, o2, o2Max, t, tMax, o2Out, tOut) => `Orienteering DP: ${targets} hedef, ${states} durum; ${chosen} hedef seçildi (O₂ ${o2} ≤ ${o2Max} kg, süre ${t} ≤ ${tMax} dk). Bütçe dışı kombinasyon: O₂ ${o2Out}, süre ${tOut}.`,
  baseName: 'Habitat / iniş aracı', roverName: 'Basınçlı rover', shelterNote: 'Gerçek sığınak', shelterMobileNote: 'Gerçek sığınak (mobil)',
  waitName: k => `Bekleme noktası ${k}`,
  waitNote: (s, svf, slope, dose) => `S=${s}, gökyüzü görüşü %${svf}, eğim ${slope}°, doz ≈ −${dose} %`,
  sepExplain: 'SEP uyarısı: keşif iptal. Bilim ödülü sıfır (w_v=0), radyasyon ağırlığı ×3; mevcut konumdan en yakın GERÇEK sığınağa (habitat/rover) rota.',
  cacheHit: 'Dönüş-O₂ alanı önbellekten.',
  sun: (az, el, ltst, ls, tAir, shadePct, noLosPct) => `Güneş: azimut ${az}°, yükseklik ${el}° (LTST ${ltst}, Ls ${ls}°); hava ${tAir} °C; gölge %${shadePct}; üs ile görüş hattı dışı %${noLosPct}.`,
  veto: (pct, v, sep) => `Veto hücreleri %${pct}: eğim>${v.E}°, kaya>%${v.K}, zemin>${v.Z}${sep ? '' : `, R>${v.R}`}, T>${v.T}.`,
  start: (pos, o2, min, targets, rover) => `Başlangıç: ${pos ? `mevcut konum (${pos[0]}, ${pos[1]})` : 'habitat'}; harcanan O₂ ${o2} kg, geçen ${min} dk; hedef ${targets}; rover ${rover ? 'var' : 'yok'}.`,
  shelterTime: (min, rover) => `Sığınağa süre: ${min} dk (${rover ? 'rover' : 'habitat'}).`,
  noShelter: 'Hiçbir sığınağa veto dışı yol yok!',
  coarseFail: 'Kaba ızgara sıralaması ince ızgarada çözülemedi; tam çözünürlükte yeniden.',
  coarseOk: 'Sıralama 2 m kaba ızgarada (veto muhafazakâr), bacaklar 1 m tam çözünürlükte A*.',
  warnNoReturn: m => `Dönüşü olmayan nokta: ${m} m'de O₂ rezervi (1.2× dönüş) ihlal → acil dönüş`,
  warnLowConfidence: (c, limit) => `Düşük veri güveni: C_rota ${c} < ${limit}`,
  warnUncovered: (pct, min) => `Rotanın %${pct}'i bekleme noktasına ${min} dk'dan uzak`,
  warnTime: (t, max) => `Süre bütçesi aşıldı: ${t} > ${max} dk`,
  warnWater: (kg, max) => `Soğutma suyu yetersiz: ${kg} > ${max} kg`,
  warnBuddy: pct => `Eş astronot görüş hattı rotanın %${pct}'inde kopuk`,
  whySafety: (s, m, terrain, slope, low, total) => `En düşük güvenlik ${s}, ${m} m'de (${terrain}, eğim ${slope}°); S<50 hücre sayısı ${low} / ${total}.`,
  whyMargin: (m, kg, min) => `Walk-back marjı en dar ${m} m'de: ${kg} kg O₂ (≈ ${min} dk nominal tüketim).`,
  whyShelter: (min, waits, limit) => `Gerçek sığınağa (habitat/rover) en uzak nokta ${min} dk; ${waits} bekleme noktası ${limit} dk içinde.`,
  labelShelter: 'Sığınak rotası', labelPrimary: 'Birincil rota', labelB: 'B planı',
  warnBCost: ratio => `B planı O₂ maliyeti A'nın ${ratio} katı`,
  warnBOverlap: pct => `Anlamlı alternatif yok (örtüşme %${pct})`,
  routeA: (d, t, o2, s, smin, v, c, u, sd, sv, ss) => `Rota A: ${d} m, ${t} dk, O₂ ${o2} kg; S_rota ${s} (min ${smin}), V ${v}, C ${c}, U ${u}. Düz çizgi: ${sd} m, ${sv} veto hücresi, min S ${ss}.`,
  routeB: (s, m, buffer, k, overlap) => `Rota B: A'nın en zayıf halkası (S=${s}, ${m} m) 12 m yarıçapla vetolandı; A'nın ${buffer} m tamponunda maliyet ×${k}; örtüşme %${overlap}.`,
  failShelter: 'Sığınak rotası üretilemedi.',
  failNone: 'Hiçbir hedefe güvenli yol bulunamadı; vetolar veya bütçe çok kısıtlayıcı.',
};

const en: EngineMessages = {
  terrain: ['firm soil', 'bedrock', 'rocky ground', 'boulder field', 'sand ripple', 'crater rim'],
  noSafePath: 'No safe path outside the no-go cells',
  skipTime: min => `the time budget (${min} min) is not enough`,
  skipO2: kg => `the O₂ budget (${kg} kg usable) is not enough`,
  skipOther: 'does not fit the budget together with the other targets; lower science value',
  ordering: (targets, states, chosen, o2, o2Max, t, tMax, o2Out, tOut) => `Orienteering DP: ${targets} targets, ${states} states; ${chosen} targets chosen (O₂ ${o2} ≤ ${o2Max} kg, time ${t} ≤ ${tMax} min). Combinations over budget: O₂ ${o2Out}, time ${tOut}.`,
  baseName: 'Habitat / lander', roverName: 'Pressurised rover', shelterNote: 'Real shelter', shelterMobileNote: 'Real shelter (mobile)',
  waitName: k => `Waiting point ${k}`,
  waitNote: (s, svf, slope, dose) => `S=${s}, sky view ${svf}%, slope ${slope}°, dose ≈ −${dose}%`,
  sepExplain: 'SEP alert: exploration cancelled. Science reward set to zero (w_v=0), radiation weight ×3; route from the current position to the nearest REAL shelter (habitat or rover).',
  cacheHit: 'Return-O₂ field taken from cache.',
  sun: (az, el, ltst, ls, tAir, shadePct, noLosPct) => `Sun: azimuth ${az}°, elevation ${el}° (LTST ${ltst}, Ls ${ls}°); air ${tAir} °C; shade ${shadePct}%; out of line of sight with base ${noLosPct}%.`,
  veto: (pct, v, sep) => `No-go cells ${pct}%: slope>${v.E}°, rock>${v.K}%, ground>${v.Z}${sep ? '' : `, R>${v.R}`}, T>${v.T}.`,
  start: (pos, o2, min, targets, rover) => `Start: ${pos ? `current position (${pos[0]}, ${pos[1]})` : 'habitat'}; O₂ used ${o2} kg, elapsed ${min} min; targets ${targets}; rover ${rover ? 'available' : 'none'}.`,
  shelterTime: (min, rover) => `Time to shelter: ${min} min (${rover ? 'rover' : 'habitat'}).`,
  noShelter: 'No shelter can be reached outside the no-go cells!',
  coarseFail: 'The coarse-grid ordering could not be solved on the fine grid; repeating at full resolution.',
  coarseOk: 'Ordering on the 2 m coarse grid (conservative no-go), legs with A* at 1 m full resolution.',
  warnNoReturn: m => `Point of no return: O₂ reserve (1.2× return) violated at ${m} m → return now`,
  warnLowConfidence: (c, limit) => `Low data confidence: route C ${c} < ${limit}`,
  warnUncovered: (pct, min) => `${pct}% of the route is more than ${min} min from a waiting point`,
  warnTime: (t, max) => `Time budget exceeded: ${t} > ${max} min`,
  warnWater: (kg, max) => `Not enough cooling water: ${kg} > ${max} kg`,
  warnBuddy: pct => `Crewmate line of sight lost on ${pct}% of the route`,
  whySafety: (s, m, terrain, slope, low, total) => `Lowest safety ${s} at ${m} m (${terrain}, slope ${slope}°); cells with S<50: ${low} / ${total}.`,
  whyMargin: (m, kg, min) => `Walk-back margin is tightest at ${m} m: ${kg} kg O₂ (≈ ${min} min at nominal use).`,
  whyShelter: (min, waits, limit) => `Farthest point from a real shelter (habitat or rover): ${min} min; ${waits} waiting points within ${limit} min.`,
  labelShelter: 'Shelter route', labelPrimary: 'Primary route', labelB: 'Plan B',
  warnBCost: ratio => `Plan B costs ${ratio}× the O₂ of route A`,
  warnBOverlap: pct => `No meaningful alternative (overlap ${pct}%)`,
  routeA: (d, t, o2, s, smin, v, c, u, sd, sv, ss) => `Route A: ${d} m, ${t} min, O₂ ${o2} kg; route S ${s} (min ${smin}), V ${v}, C ${c}, U ${u}. Straight line: ${sd} m, ${sv} no-go cells, min S ${ss}.`,
  routeB: (s, m, buffer, k, overlap) => `Route B: the weakest link of A (S=${s}, ${m} m) was blocked with a 12 m radius; cost ×${k} inside the ${buffer} m buffer around A; overlap ${overlap}%.`,
  failShelter: 'No shelter route could be produced.',
  failNone: 'No safe path to any target; the no-go rules or the budget are too restrictive.',
};

export const ENGINE_MESSAGES: Record<Lang, EngineMessages> = { tr, en };
