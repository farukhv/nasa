import type { POI, SceneMeta } from './engine/types';

export interface SceneDef {
  id: string; title: string; subtitle: string; region: string;
  base: { x: number; y: number; name: string };
  pois: POI[];
  defaults: { o2Kg: number; waterKg: number; maxMinutes: number; ltst: number };
  dataTypes: string[];
  povImages: { src: string; title: string; credit: string; note: string }[];
}

/** Three Forks sample depot tube coordinates (PDS sample_tube_locations.csv) */
export const THREE_FORKS_TUBES: { name: string; lat: number; lon: number; kind: string }[] = [
  { name: 'Malay', lat: 18.45262651, lon: 77.40775601, kind: 'kaya karotu' },
  { name: 'Mageik', lat: 18.4525234, lon: 77.40784692, kind: 'kaya karotu' },
  { name: 'Crosswind Lake', lat: 18.45267034, lon: 77.408056, kind: 'regolit' },
  { name: 'Roubion', lat: 18.45276569, lon: 77.40807823, kind: 'atmosfer' },
  { name: 'Coulettes', lat: 18.45272365, lon: 77.4082, kind: 'kaya karotu' },
  { name: 'Montdenier', lat: 18.45281322, lon: 77.40824352, kind: 'kaya karotu' },
  { name: 'Bearwallow', lat: 18.45272753, lon: 77.40833585, kind: 'kaya karotu' },
  { name: 'Skyland', lat: 18.45300487, lon: 77.4085047, kind: 'kaya karotu' },
  { name: 'Atsah', lat: 18.45306554, lon: 77.40860064, kind: 'kaya karotu' },
  { name: 'Amalik (tanık)', lat: 18.45337179, lon: 77.40844668, kind: 'tanık tüp' },
];

export function lonLatToGrid(meta: SceneMeta, lon: number, lat: number) {
  return { x: (lon - meta.lon0) / (meta.lon1 - meta.lon0) * meta.W, y: (meta.lat1 - lat) / (meta.lat1 - meta.lat0) * meta.H };
}
export function gridToLonLat(meta: SceneMeta, x: number, y: number) {
  return { lon: meta.lon0 + x / meta.W * (meta.lon1 - meta.lon0), lat: meta.lat1 - y / meta.H * (meta.lat1 - meta.lat0) };
}

export function buildScenes(meta: SceneMeta): SceneDef {
  if (meta.id === 'jezero') {
    const c = THREE_FORKS_TUBES.reduce((a, t) => ({ lat: a.lat + t.lat / 10, lon: a.lon + t.lon / 10 }), { lat: 0, lon: 0 });
    const depot = lonLatToGrid(meta, c.lon, c.lat);
    const largest = [...meta.craters].sort((a, b) => b[2] - a[2])[0];
    const pois: POI[] = [
      { id: 'TF', name: 'Three Forks deposu (10 tüp)', x: depot.x, y: depot.y, kind: 'sample', value: 95, dwellMin: 60, sampleKg: 1.0,
        note: '7 kaya karotu, 1 regolit, 1 atmosfer, 1 tanık tüp; 28 Oca 2023. MSR iptal senaryosunda astronot toplar.', source: 'PDS sample_tube_locations.csv' },
      { id: 'SCARP', name: 'Delta önü katmanlı yar (anakaya)', x: 750, y: 125, kind: 'science', value: 85, dwellMin: 25, sampleKg: 2.0,
        note: 'Açık tonlu katmanlı anakaya: stratigrafi, kontaklar; en yüksek bilimsel öncelik sınıfı.', source: 'HiRISE ortho + 1 m DTM eğim; CRISM olivin+smektit' },
      { id: 'ROCKS', name: 'Kaya tarlası (float örnekleme)', x: 915, y: 540, kind: 'science', value: 55, dwellMin: 15, sampleKg: 1.5,
        note: 'Tümsekli, kayalık ova; çeşitlilik yüksek ama bağlam zayıf (float).', source: 'Doku + gölge-çifti kaya yoğunluğu' },
      { id: 'RIPPLE', name: 'Dalga alanı kenarı (eolyen)', x: 665, y: 375, kind: 'science', value: 30, dwellMin: 10, sampleKg: 0.5,
        note: 'TAR/dalga: aktif eolyen süreç; batma riski yüzünden kenardan örnekle.', source: 'Yapı tensörü tutarlılığı' },
    ];
    if (largest) pois.push({ id: 'CRATER', name: 'Küçük krater (ejekta)', x: largest[0] + largest[2] * 1.2, y: largest[1], kind: 'science', value: 50, dwellMin: 12, sampleKg: 1.0,
      note: `Çap ≈ ${(2 * largest[2]).toFixed(0)} m; derin malzeme ejektada; kenara yaklaşma, iç duvar vetolu.`, source: 'Güneş-yönlü karanlık→parlak çift tespiti' });
    return {
      id: 'jezero', title: 'Jezero · Three Forks', subtitle: 'Perseverance örnek deposu ve delta önü', region: '18.4528°N 77.4080°E · 1.2 × 1.2 km',
      base: { x: 330, y: 780, name: 'Habitat / iniş aracı (varsayım)' },
      pois,
      defaults: { o2Kg: 0.72, waterKg: 3.9, maxMinutes: 420, ltst: 10.5 },
      dataTypes: ['Optik: HiRISE 25 cm ortho (Mars Trek WMTS)', 'Topografik: USGS HiRISE 1 m DTM (CC0)', 'Spektral: CRISM baskın mineraloji (Zenodo 5575824)', 'Yer gerçeği: Three Forks tüp koordinatları (PDS)', 'Atmosferik: MEDA tipi günlük sıcaklık modeli', 'Radyasyon: RAD tabanı + gökyüzü görüş faktörü'],
      povImages: [
        { src: '/pov/perseverance_rim.jpg', title: 'Mastcam-Z panoraması — Jezero krater kenarı', credit: 'NASA/JPL-Caltech/ASU/MSSS (en olası: PIA26644 Falbreen)', note: 'Kayalık ama yürünebilir zemin örneği: dağınık koyu float kayalar, sıkı tan toprak.' },
        { src: '/pov/kenmore_abrasion.jpg', title: 'WATSON aşındırma yaması', credit: 'NASA/JPL-Caltech/MSSS (en olası: PIA26576 Kenmore)', note: 'Işınsal çizgiler aşındırma izi; beyaz feldspat tanecikleri, Mn/Ni lekeli çatlak. Yüksek öncelikli örnekleme hedefi tipi.' },
      ],
    };
  }
  const largest = [...meta.craters].sort((a, b) => b[2] - a[2])[0];
  const pois: POI[] = [
    { id: 'HOLLOW', name: 'Homestead hollow kenarı', x: 600, y: 470, kind: 'science', value: 45, dwellMin: 15, sampleKg: 1.0,
      note: '~27 m çaplı aşınmış krater; kum/çakıl dolgu; iniş aracı çalışma alanı (Golombek 2020).', source: 'Golombek et al. 2020, Nat. Commun.' },
    { id: 'C1', name: 'Taze krater (güney)', x: 505, y: 800, kind: 'science', value: 60, dwellMin: 15, sampleKg: 1.5,
      note: 'Keskin kenar, koyu iç gölge: görece taze; ejektada yüzey altı malzeme.', source: 'Güneş-yönlü çift tespiti' },
    { id: 'C2', name: 'Krater çifti (güneydoğu)', x: 800, y: 775, kind: 'science', value: 55, dwellMin: 12, sampleKg: 1.0,
      note: 'Toz izleriyle tarihlenebilir küçük kraterler (HiRISE toz takibi).', source: 'PIA26515 açıklaması' },
    { id: 'EJECTA', name: 'Parlak kayalık yama (kuzeydoğu)', x: 975, y: 120, kind: 'science', value: 70, dwellMin: 20, sampleKg: 2.0,
      note: 'Sahnedeki en yüksek kaya yoğunluğu; blok ejekta — derin malzeme, dikkatli yaklaşım.', source: 'Doku + çift tespiti' },
  ];
  if (largest) pois.push({ id: 'CRATER', name: 'En büyük tespit edilen krater', x: largest[0] + largest[2] * 1.3, y: largest[1], kind: 'science', value: 40, dwellMin: 10, sampleKg: 0.5, note: `Çap ≈ ${(2 * largest[2] * 0.294).toFixed(0)} m`, source: 'Otomatik tespit' });
  return {
    id: 'insight', title: 'Elysium · InSight', subtitle: 'Homestead hollow — ekibin HiRISE görüntüsü', region: '4.502°N 135.623°E · 325 × 287 m',
    base: { x: 553, y: 488, name: 'InSight iniş aracı (üs)' },
    pois,
    defaults: { o2Kg: 0.45, waterKg: 3.9, maxMinutes: 180, ltst: 9.5 },
    dataTypes: ['Optik: HiRISE ESP_085514_1845 (PIA26515), 0.294 m/px', 'Topografik: YOK — krater çanaklarından sözde-DEM (Varsayım)', 'Termal/kaya: Golombek 2020 yüzey sayımı ile ankraj (TI≈166, kaya %1–4)', 'Atmosferik: InSight/MEDA tipi günlük sıcaklık modeli'],
    povImages: [
      { src: '/pov/spirit_gusev.jpg', title: 'Spirit Pancam "Mars in Full View" — Gusev', credit: 'NASA/JPL/Cornell (PIA05049)', note: 'Kaya yoğunluğu ~%5–10 olan bir ovanın yerden görünümü: bu sahnenin "kayalık" sınıfına yakın.' },
    ],
  };
}
