# Araştırma Raporu 2 — Jüri kriterleri, geçmiş kazananlar, rakip zayıflıkları, mevcut araçlar (2026-11-14)

## 1. Jüri kriterleri (5)
Impact · Creativity ("hiç denenmemiş mi, yoksa var olanın artımlı iyileştirmesi mi?") · Validity ("bilimsel olarak geçerli mi, gerçek dünyada çalışır mı?") · Relevance ("tam bir çözüm mü? kullanılabilir mi?") · Presentation.
Kaynak: https://www.spaceappschallenge.org/resources/judging-awards-guide
Hat: Yerel jüri 1–3 proje → Global Nominee → ~40 Global Finalist → 10 Global Award. 2026 jürisi 16 Kasım'da başlıyor.

## 2. 10 Global Award
Best Use of Science · Best Use of Data · Best Use of Technology · Galactic Impact · **Best Mission Concept ("en makul konsept ve tasarım") ← doğal hedef** · Most Inspirational · Best Storytelling · Global Connection · Art & Technology · Local Impact.

## 3. Proje sayfası alanları
Title · High-Level Summary · Final Project linki (herkese açık) · **Demo: 7 slayt VEYA 30 sn video (tek link; jüri sınırda durur)** · Detailed Description · **Space Agency Data (uygunluk şartı)** · Hackathon Journey · References · **Use of AI** (hangi araçlar, nasıl; AI fikir bulmak için kullanılmamalı; NASA logosu AI ile değiştirilemez).
Submission guide: https://www.spaceappschallenge.org/resources/project-submission-guide/ · FAQ: https://www.spaceappschallenge.org/resources/participant-faqs/
"30 Seconds of Glory": 0:00 ekip+neden · 0:02 problem · 0:05 çözüm adı+slogan · 0:10 nasıl çalışır + NASA verisi + kullanıcı deneyimi · 0:20 gelecek · 0:30 bitiş.

## 4. Kazanan örüntüsü (2023–2025)
- 2025 Best Mission Concept: PureFlow (habitat tasarla + **güneş fırtınasına karşı stres testi**). Best Use of Tech: SkySense ("**güvenli aktivite penceresi**" + risk). Galactic Impact: Astro Sweepers (**nesne başına risk indeksi**).
- 2024 Best Mission Concept: Landsat Connect (konum üzerinden uydu geçiş **uyarısı**). 2023: Moonquake Map 2.0 iki ödül (gerçek ALSEP verisi, filtreler, 3D); Planetary Tourism Office (güzergâh planlayıcı) Mission Concept.
- Mars yüzey projesi hiç kazanmadı (2023 "Make a Mars Rover" ve 2025 "Embiggen Your Eyes" küresel kazanan çıkarmadı) → alan açık.
- Jüri ödüllendiriyor: (1) NASA verisi görünür biçimde bir **karar çıktısı** üretiyor (risk indeksi, GO/NO-GO, uyarı); (2) adı konmuş kullanıcı ve iş akışı; (3) tek, eksiksiz, cilalı akış; (4) kaynaklı eşikler, dürüst köken; (5) sıkı hikâye.

## 5. 2026 rakiplerinin ortak zayıflıkları (herkese açık repolardan)
Repolar: leo-noble/RedStep, The-mysteryboy/marswalk-planner, AhsanulHoque22/..., ahsanur-official/..., MONSTER4REX/Martian-Map, pollob-kumar/nasa-space-apps-martian-map
- Hepsi Jezero merkezli Leaflet/MapLibre katman yığını (Mars Trek WMTS) + **20–40 m CTX DEM** üzerinde A* + GO/CAUTION/NO-GO.
- Eşikler itiraf edilen yer tutucular (15°/25°, 3.3 km/h, 8 h).
- **Tüketilebilir (O₂/CO₂/güç/soğutma) modeli yok**; giysi/0.38 g biyomekaniği yok; 40–50 m ortalamada kayalar/basamaklar görünmez; radyasyon Gale'den alınmış; "canlı" hava verisi karara etki etmiyor; "erişilebilir" = sadece eğim; bazıları sentetik arazide.
- Doğrulanamaz LLM "AI rota" eklentileri → Validity ve AI beyanı riski.

## 6. Mevcut araçlar ve insanlı EVA (10–500 m) için eksikleri
| Araç | Yapar | Eksik |
|---|---|---|
| Mars Trek | katmanlı orbital GIS, mesafe/yükseklik profili, güneş açısı, 3D, STL, WMTS | EVA modeli yok: tüketilebilir, geri yürüyüş, metabolik, zaman bütçesi, HUD |
| JMARS | masaüstü uzman GIS | astronot yüzü yok |
| MMGIS (JPL, açık kaynak) | rover traverse/örnek haritaları | rover odaklı |
| xGDS (Ames) | analog ops traverse editörü, iletişim gecikmesi simülasyonu | basit araç modeli, Mars verisi yok, kamuya kapalı |
| SEXTANT (MIT) | giysili astronot/rover zaman-enerji-mesafe optimizasyonu, güneş/gölge; Holo-SEXTANT AR | kamuya açık değil, canlı tüketilebilir yok, 2018'de kalmış |
| Minerva (xGDS+SEXTANT+Playbook) | BASALT analog | **plan↔zaman çizelgesi↔yeniden planlama bağı zayıf** (tespit edilen boşluk) |
| NASA SUITS | öğrenci Artemis HUD | Ay, simüle telemetri, sadece ABD |
| Apollo kuralı | PLSS ile geri yürünebilecek mesafe (~9.7 km; A17 7.6 km); en uzak noktaya önce git | kâğıt, dinamik değil |
| M2020 RSVP/AutoNav/TRN | eğim limiti, dikey basamak, tekerlek düşüşü >14 in | tekerlekli, yaşam desteği yok |
Net: orbital GIS çözülmüş, rover yol planlama çözülmüş; **gerçek Mars verisi + giysili insan fizyoloji/tüketilebilir modeli + canlı yeniden planlama** birleşimi kamuya açık hiçbir araçta yok.

## 7. Gerçekçilik için sayılar
- DRA 5.0: ~500 sol kalış, 6 kişi, EVA min 2 maks 4 kişi, **~15 km geri yürüyüş mesafesi**. https://www.nasa.gov/wp-content/uploads/2015/09/373665main_nasa-sp-2009-566.pdf
- Exploration Zone (Bussey & Hoffman 2016): ROI'ler **100 km yarıçap**, enlem ±50°, yükseklik ≤ +2 km, iniş doğruluğu 100 m (3σ), iniş pedi çevresi **1000 m plume keep-out**, basınçlı rover 2 kişi 2 hafta ~100 km düz çizgi. 2015 çalıştayı 47 EZ önerisi. https://ntrs.nasa.gov/api/citations/20160002370/downloads/20160002370.pdf
- MSL/M2020 iniş kriterleri: 2–5 m ölçekte eğim ≤15°, kaya bolluğu ~%10; termal atalet <140 = tozlu/gevşek.
- Perseverance çoğu sürüş <14°; 15–20° kaymalar. HiRISE DTM ~1 m (CC0, USGS M2020 TRN mozaik) — **EVA ölçeği için şart**, CTX 20 m sadece bağlam.
- Giysi: ppCO₂ <7.6 mmHg alarmı; metabolik tasarım ortalaması 250–310 kcal/h (290–360 W) 8 h boyunca, tepe 3000 BTU/h; giysi cezası ≈ +14 ml/min/kg VO₂ (ICES 2026); JSC 10 km geri yürüyüş çalışması; Apollo EVA'ları <%10 tüketilebilirle bitti.
- RAD: 0.210±0.040 mGy/gün, ~0.64–0.67 mSv/gün; SEP 10 Eyl 2017: yüzey doz hızı birkaç saatte 2–3×.
- MEDA Jezero: ortalama −55 °C, günlük 50–60 °C salınım, öğle güneydoğu hamleleri ~25 m/s, ~4 toz şeytanı/sol, çap 5–135 m. MEDA kamu beslemesi Nis 2024'te durdu; REMS devam ediyor.

## 8. Kimsenin doldurmadığı boşluklar
1. Gerçek **tüketilebilir/fizyoloji motoru** (küçülen geri yürüyüş dairesi, ppCO₂ alarmı)
2. **Metre altı arazi** (1 m HiRISE DTM, 2–5 m ölçekte eğim, 30 cm engeller)
3. **Radyasyon canlı mekânsal katman: SEP "sığınağa süre"**
4. **Yürütme modu** (plan↔zaman çizelgesi↔yeniden planlama; "en uzak önce" sıralaması)
5. **Kısıt altında bilim optimizasyonu** (orienteering; bilim vs. marj Pareto)
6. **EZ ölçeği → EVA ölçeği sürekliliği** (keep-out'lar, ISRU ROI'ler → koridor)
7. **Köken ve belirsizlik UI'da** (Observed/Derived/Modelled/Assumed etiketleri; LLM güvenlik mantığının dışında)
8. **Hiper-yerel EVA hava penceresi** (saat saat)
9. **İki ayaklı yürüyüş tehlike modeli** (bilek burkulma 10–30 cm kaya, >20° çapraz eğim, düşük termal atalet batma)
10. **Demo disiplini**: tek tam akış (ROI seç → planla → yürü → yeniden planla → marjla dön)

Hedef ödül: **Best Mission Concept**; ikincil Best Use of Science / Best Use of Data.
