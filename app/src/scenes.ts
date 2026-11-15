import type { Lang, POI, SceneMeta } from './engine/types';

export interface SceneDef {
  id: string; title: string; subtitle: string; region: string;
  base: { x: number; y: number; name: string };
  pois: POI[];
  defaults: { o2Kg: number; waterKg: number; maxMinutes: number; ltst: number };
  dataTypes: string[];
  povImages: { src: string; title: string; credit: string; note: string }[];
}

/** Three Forks sample depot tube coordinates (PDS sample_tube_locations.csv) */
export const THREE_FORKS_TUBES: { name: string; lat: number; lon: number; kind: 'rock core' | 'regolith' | 'atmosphere' | 'witness tube' }[] = [
  { name: 'Malay', lat: 18.45262651, lon: 77.40775601, kind: 'rock core' },
  { name: 'Mageik', lat: 18.4525234, lon: 77.40784692, kind: 'rock core' },
  { name: 'Crosswind Lake', lat: 18.45267034, lon: 77.408056, kind: 'regolith' },
  { name: 'Roubion', lat: 18.45276569, lon: 77.40807823, kind: 'atmosphere' },
  { name: 'Coulettes', lat: 18.45272365, lon: 77.4082, kind: 'rock core' },
  { name: 'Montdenier', lat: 18.45281322, lon: 77.40824352, kind: 'rock core' },
  { name: 'Bearwallow', lat: 18.45272753, lon: 77.40833585, kind: 'rock core' },
  { name: 'Skyland', lat: 18.45300487, lon: 77.4085047, kind: 'rock core' },
  { name: 'Atsah', lat: 18.45306554, lon: 77.40860064, kind: 'rock core' },
  { name: 'Amalik', lat: 18.45337179, lon: 77.40844668, kind: 'witness tube' },
];

export function lonLatToGrid(meta: SceneMeta, lon: number, lat: number) {
  return { x: (lon - meta.lon0) / (meta.lon1 - meta.lon0) * meta.W, y: (meta.lat1 - lat) / (meta.lat1 - meta.lat0) * meta.H };
}
export function gridToLonLat(meta: SceneMeta, x: number, y: number) {
  return { lon: meta.lon0 + x / meta.W * (meta.lon1 - meta.lon0), lat: meta.lat1 - y / meta.H * (meta.lat1 - meta.lat0) };
}

/** Scene description in the requested language. Positions and numbers are identical in both. */
export function buildScenes(meta: SceneMeta, lang: Lang = 'tr'): SceneDef {
  const L = (tr: string, en: string) => (lang === 'tr' ? tr : en);
  const largest = [...meta.craters].sort((a, b) => b[2] - a[2])[0];

  if (meta.id === 'jezero') {
    const c = THREE_FORKS_TUBES.reduce((a, t) => ({ lat: a.lat + t.lat / 10, lon: a.lon + t.lon / 10 }), { lat: 0, lon: 0 });
    const depot = lonLatToGrid(meta, c.lon, c.lat);
    const pois: POI[] = [
      { id: 'TF', name: L('Three Forks deposu (10 tüp)', 'Three Forks depot (10 tubes)'), x: depot.x, y: depot.y, kind: 'sample', value: 95, dwellMin: 60, sampleKg: 1.0,
        note: L('7 kaya karotu, 1 regolit, 1 atmosfer, 1 tanık tüp; 28 Oca 2023. MSR iptal senaryosunda astronot toplar.', '7 rock cores, 1 regolith, 1 atmosphere and 1 witness tube; 28 Jan 2023. If sample return is cancelled, an astronaut collects them.'), source: 'PDS sample_tube_locations.csv' },
      { id: 'SCARP', name: L('Delta önü katmanlı yar (anakaya)', 'Layered delta-front scarp (bedrock)'), x: 750, y: 125, kind: 'science', value: 85, dwellMin: 25, sampleKg: 2.0,
        note: L('Açık tonlu katmanlı anakaya: stratigrafi, kontaklar; en yüksek bilimsel öncelik sınıfı.', 'Light-toned layered bedrock: stratigraphy and contacts; the highest science priority class.'), source: L('HiRISE ortho + 1 m DTM eğim; CRISM olivin+smektit', 'HiRISE ortho + 1 m DTM slope; CRISM olivine + smectite') },
      { id: 'ROCKS', name: L('Kaya tarlası (float örnekleme)', 'Rock field (float sampling)'), x: 915, y: 540, kind: 'science', value: 55, dwellMin: 15, sampleKg: 1.5,
        note: L('Tümsekli, kayalık ova; çeşitlilik yüksek ama bağlam zayıf (float).', 'Hummocky, rocky plain; high diversity but weak context (float rock).'), source: L('Doku + gölge-çifti kaya yoğunluğu', 'Texture + shadow-pair rock abundance') },
      { id: 'RIPPLE', name: L('Dalga alanı kenarı (eolyen)', 'Ripple field edge (aeolian)'), x: 665, y: 375, kind: 'science', value: 30, dwellMin: 10, sampleKg: 0.5,
        note: L('TAR/dalga: aktif eolyen süreç; batma riski yüzünden kenardan örnekle.', 'Transverse ridges and ripples: an active aeolian process; sample from the edge because of sinkage risk.'), source: L('Yapı tensörü tutarlılığı', 'Structure-tensor coherence') },
    ];
    if (largest) pois.push({ id: 'CRATER', name: L('Küçük krater (ejekta)', 'Small crater (ejecta)'), x: largest[0] + largest[2] * 1.2, y: largest[1], kind: 'science', value: 50, dwellMin: 12, sampleKg: 1.0,
      note: L(`Çap ≈ ${(2 * largest[2]).toFixed(0)} m; derin malzeme ejektada; kenara yaklaşma, iç duvar vetolu.`, `Diameter ≈ ${(2 * largest[2]).toFixed(0)} m; deep material in the ejecta; stay off the rim, the inner wall is no-go.`), source: L('Güneş-yönlü karanlık→parlak çift tespiti', 'Sun-aligned dark→bright pair detection') });
    return {
      id: 'jezero', title: 'Jezero · Three Forks', subtitle: L('Perseverance örnek deposu ve delta önü', 'Perseverance sample depot and delta front'), region: '18.4528°N 77.4080°E · 1.2 × 1.2 km',
      base: { x: 330, y: 780, name: L('Habitat / iniş aracı (varsayım)', 'Habitat / lander (assumed)') },
      pois,
      defaults: { o2Kg: 0.72, waterKg: 3.9, maxMinutes: 420, ltst: 10.5 },
      dataTypes: lang === 'tr'
        ? ['Optik: HiRISE 25 cm ortho (Mars Trek WMTS)', 'Topografik: USGS HiRISE 1 m DTM (CC0)', 'Spektral: CRISM baskın mineraloji (Zenodo 5575824)', 'Yer gerçeği: Three Forks tüp koordinatları (PDS)', 'Atmosferik: MEDA tipi günlük sıcaklık modeli', 'Radyasyon: RAD tabanı + gökyüzü görüş faktörü']
        : ['Optical: HiRISE 25 cm ortho (Mars Trek WMTS)', 'Topographic: USGS HiRISE 1 m DTM (CC0)', 'Spectral: CRISM dominant mineralogy (Zenodo 5575824)', 'Ground truth: Three Forks tube coordinates (PDS)', 'Atmospheric: MEDA-style diurnal temperature model', 'Radiation: RAD baseline + sky view factor'],
      povImages: [
        { src: '/pov/perseverance_rim.jpg', title: L('Mastcam-Z panoraması — Jezero krater kenarı', 'Mastcam-Z panorama — Jezero crater rim'), credit: L('NASA/JPL-Caltech/ASU/MSSS (en olası: PIA26644 Falbreen)', 'NASA/JPL-Caltech/ASU/MSSS (most likely PIA26644 Falbreen)'),
          note: L('Kayalık ama yürünebilir zemin örneği: dağınık koyu float kayalar, sıkı tan toprak.', 'An example of rocky but walkable ground: scattered dark float rocks on firm tan soil.') },
        { src: '/pov/kenmore_abrasion.jpg', title: L('WATSON aşındırma yaması', 'WATSON abrasion patch'), credit: L('NASA/JPL-Caltech/MSSS (en olası: PIA26576 Kenmore)', 'NASA/JPL-Caltech/MSSS (most likely PIA26576 Kenmore)'),
          note: L('Işınsal çizgiler aşındırma izi; beyaz feldspat tanecikleri, Mn/Ni lekeli çatlak. Yüksek öncelikli örnekleme hedefi tipi.', 'The radial lines are abrasion marks; white feldspar grains and a fracture stained with Mn/Ni. The kind of target that gets high sampling priority.') },
      ],
    };
  }

  const pois: POI[] = [
    { id: 'HOLLOW', name: L('Homestead hollow kenarı', 'Homestead hollow rim'), x: 600, y: 470, kind: 'science', value: 45, dwellMin: 15, sampleKg: 1.0,
      note: L('~27 m çaplı aşınmış krater; kum/çakıl dolgu; iniş aracı çalışma alanı (Golombek 2020).', 'A degraded crater about 27 m across with sand and pebble fill; the lander workspace (Golombek 2020).'), source: 'Golombek et al. 2020, Nat. Commun.' },
    { id: 'C1', name: L('Taze krater (güney)', 'Fresh crater (south)'), x: 505, y: 800, kind: 'science', value: 60, dwellMin: 15, sampleKg: 1.5,
      note: L('Keskin kenar, koyu iç gölge: görece taze; ejektada yüzey altı malzeme.', 'Sharp rim and a dark interior shadow: relatively fresh; subsurface material in the ejecta.'), source: L('Güneş-yönlü çift tespiti', 'Sun-aligned pair detection') },
    { id: 'C2', name: L('Krater çifti (güneydoğu)', 'Crater pair (south-east)'), x: 800, y: 775, kind: 'science', value: 55, dwellMin: 12, sampleKg: 1.0,
      note: L('Toz izleriyle tarihlenebilir küçük kraterler (HiRISE toz takibi).', 'Small craters that can be dated from their dust cover (HiRISE dust monitoring).'), source: L('PIA26515 açıklaması', 'PIA26515 caption') },
    { id: 'EJECTA', name: L('Parlak kayalık yama (kuzeydoğu)', 'Bright rocky patch (north-east)'), x: 975, y: 120, kind: 'science', value: 70, dwellMin: 20, sampleKg: 2.0,
      note: L('Sahnedeki en yüksek kaya yoğunluğu; blok ejekta — derin malzeme, dikkatli yaklaşım.', 'The highest rock abundance in the scene; blocky ejecta, so deep material and a careful approach.'), source: L('Doku + çift tespiti', 'Texture + pair detection') },
  ];
  if (largest) pois.push({ id: 'CRATER', name: L('En büyük tespit edilen krater', 'Largest detected crater'), x: largest[0] + largest[2] * 1.3, y: largest[1], kind: 'science', value: 40, dwellMin: 10, sampleKg: 0.5,
    note: L(`Çap ≈ ${(2 * largest[2] * 0.294).toFixed(0)} m`, `Diameter ≈ ${(2 * largest[2] * 0.294).toFixed(0)} m`), source: L('Otomatik tespit', 'Automatic detection') });
  return {
    id: 'insight', title: 'Elysium · InSight', subtitle: L('Homestead hollow — ekibin HiRISE görüntüsü', 'Homestead hollow — the team\'s own HiRISE image'), region: '4.502°N 135.623°E · 325 × 287 m',
    base: { x: 553, y: 488, name: L('InSight iniş aracı (üs)', 'InSight lander (base)') },
    pois,
    defaults: { o2Kg: 0.45, waterKg: 3.9, maxMinutes: 180, ltst: 9.5 },
    dataTypes: lang === 'tr'
      ? ['Optik: HiRISE ESP_085514_1845 (PIA26515), 0.294 m/px', 'Topografik: YOK — krater çanaklarından sözde-DEM (Varsayım)', 'Termal/kaya: Golombek 2020 yüzey sayımı ile ankraj (TI≈166, kaya %1–4)', 'Atmosferik: InSight/MEDA tipi günlük sıcaklık modeli']
      : ['Optical: HiRISE ESP_085514_1845 (PIA26515), 0.294 m/px', 'Topographic: NONE — pseudo-DEM from crater bowls (assumed)', 'Thermal/rock: anchored to the Golombek 2020 surface count (TI≈166, rock 1–4%)', 'Atmospheric: InSight/MEDA-style diurnal temperature model'],
    povImages: [
      { src: '/pov/spirit_gusev.jpg', title: 'Spirit Pancam "Mars in Full View" — Gusev', credit: 'NASA/JPL/Cornell (PIA05049)',
        note: L('Kaya yoğunluğu ~%5–10 olan bir ovanın yerden görünümü: bu sahnenin "kayalık" sınıfına yakın.', 'A ground view of a plain with about 5–10% rock abundance: close to the "rocky" class of this scene.') },
    ],
  };
}
