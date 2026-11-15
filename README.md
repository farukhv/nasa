# Martian Map — Interplanetary Survival Guide (NASA Space Apps 2026)

Mars astronotu için **hiper-yerel EVA rota planlayıcı ve karar destek sistemi**. Gerçek yörünge verisinden
(HiRISE ortho + 1 m DTM + CRISM) hücre bazlı güvenlik / bilim / güven puanları üretir; O₂ ve soğutma suyu
bütçesi içinde çoklu bilimsel hedefi sıralar; birincil rota + B planı + koridor + sığınaklar + walk-back limiti verir.

## Hızlı başlangıç
```bash
cd app && npm install && npm run dev      # http://localhost:5173
```
Sahne verileri `data/public/scenes/` altında hazır gelir (Jezero · Three Forks ve Elysium · InSight).

Veriyi yeniden üretmek için (internet gerekir, ~3 dk):
```bash
pip install rasterio numpy opencv-python scipy scikit-image pillow
python pipeline/fetch_jezero.py          # Mars Trek HiRISE tile'ları + USGS 1 m DTM penceresi
python pipeline/build_scene.py jezero    # özellik kanalları → data/public/scenes/jezero
python pipeline/build_scene.py insight   # ekibin PIA26515.tif görüntüsünden
```

## Jüri sunumu
- Tarayıcıda açılan bağımsız kopya: `sunum/index.html` (ok tuşları ya da tıklama ile ilerler, **N** konuşmacı notları, **F** tam ekran).
- Kaynaklar: `sunum/deck/project/` (slaytlar ve stil), `sunum/assets/` (ekran görüntüleri, grafikler, analiz görselleri).
- Yeniden üretim: `python sunum/make_charts.py` (grafikler), `node sunum/shots.mjs` (uygulama ekran görüntüleri; önce `npm run dev`), `node sunum/build_standalone.mjs` (bağımsız kopya).
- Konuşma akışı, süre planı ve zor sorular: `docs/JURI-SUNUM-REHBERI.md`.

## Klasörler
| Yol | İçerik |
|---|---|
| `app/src/engine/config.ts` | Tüm ağırlıklar, katsayılar, eşikler ve kaynak gerekçeleri (tek yer) |
| `app/src/engine/fields.ts` | Hücre S/V/C, veto, gölge, viewshed, radyasyon, sıcaklık |
| `app/src/engine/search.ts` | Dijkstra (ters kenarlı), A* (octile), mesafe dönüşümü |
| `app/src/engine/route.ts` | Orienteering DP, rota A/B, koridor, sığınaklar, walk-back, puanlama |
| `app/src/engine/physio.ts` | O₂, soğutma suyu, hız, yorgunluk, güneş, toz modelleri |
| `app/src/workers/planner.worker.ts` | Hesaplar Web Worker'da; arayüz kilitlenmez |
| `app/src/ui/*` | Harita (Canvas), paneller, profil şeridi, HUD |
| `pipeline/` | Python ön işleme (kaya yoğunluğu, sınıflar, SVF, ufuk açıları, CRISM) |
| `sunum/` | Jüri sunumu: bağımsız HTML, slayt kaynakları, grafik ve ekran görüntüsü betikleri |
| `docs/` | Araştırma ve ara raporlar (TR) |

## Raporlar
- `docs/ARA-RAPOR-1-gereksinim-ve-arastirma.md` — gereksinim analizi, kaya/toprak oranlaması, formül düzeltmeleri
- `docs/ARA-RAPOR-2-sistem-ve-formuller.md` — kurulan sistem, uygulanan formüller, test sonuçları, sınırlar
- `docs/ARA-RAPOR-3-dis-goz-inceleme-ve-eklemeler.md` — dış göz incelemeleri ve uygulanan eklemeler
- `docs/JURI-SUNUM-REHBERI.md` — jüri sunum rehberi
- `docs/STRATEGY.md`, `docs/research-*.md` — önceki strateji ve kaynak araştırmaları

## Veri ve atıf
HiRISE: NASA/JPL-Caltech/UArizona · Arazi modeli: USGS Astrogeology (CC0) · CRISM haritası: Parente, Itoh, Saranathan (Zenodo 5575824, CC-BY) · Perseverance görüntüleri ve yol noktaları: NASA/JPL-Caltech. Orijinal ham dosyalar depoda yoktur; `pipeline/` betikleriyle yeniden indirilir.
