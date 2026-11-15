# STRATEJİ — "Interplanetary Survival Guide: Martian Map" için özgün geliştirme planı
Tarih: 2026-11-14 · Kaynak raporlar: research-science-eva.md, research-judging-competitors.md, research-data-sources.md

## 0. Tek cümlelik tez
Herkes "Mars'ın katmanlı haritasını" yapıyor; biz **astronotun yaşam destek sistemine bağlı, kendi kendine yeniden planlayan bir "yerleşik uçuş direktörü"** yapıyoruz. Harita girdi, **karar** çıktı.

## 1. Rakiplerin durumu (2026 açık repolardan) ve bizim farkımız
| Rakiplerin yaptığı | Rakiplerin itiraf ettiği eksik | Bizim cevabımız |
|---|---|---|
| Jezero + Leaflet + Trek tile'ları + A* | — | Aynı tabanı 2 saatte kuruyoruz, farkı üstüne ekliyoruz |
| 20–40 m CTX DEM üzerinde eğim | Kayalar/basamaklar görünmez | **1 m HiRISE DTM** (USGS CC0, hazır URL) → 2–5 m ölçekte eğim, >0.3 m adım tehlikesi |
| GO / CAUTION / NO-GO rengi | O₂, CO₂, güç, soğutma modeli yok | **Tüketilebilir motoru + canlı Bingo Zarfı** (küçülen git-dön sınırı) |
| Radyasyon: Gale'den tek sayı | Mekânsal değil | **Gökyüzü-görüş faktörü ile göreli doz katmanı + SEP "sığınağa süre"** |
| "Canlı hava" göstergesi | Karara etki etmiyor | Hava/toz şeytanı/UV penceresi **doğrudan EVA saati önerisine ve hıza etki ediyor** |
| LLM chatbot "AI rota" | Doğrulanamaz | Deterministik kural motoru; AI sadece anlatım. "Use of AI" alanında açıkça yazılır |
| Çok sayıda yarım mod | Tam akış yok | **Tek eksiksiz akış**: hedef seç → planla → yürü → olay → yeniden planla → marjla dön |

## 2. Konsept: "ARES GUIDE" (çalışma adı — ekip değiştirebilir)
Üç görünüm, tek veri modeli:
1. **Habitat planlama ekranı** (büyük ekran): Exploration Zone mantığı — iniş pedi 1000 m plume keep-out, habitat, ISRU/bilim ROI'leri; sonra EVA koridoruna zoom.
2. **Tablet (EVA sırasında)**: harita + zaman çizelgesi + tüketilebilir göstergeleri + Bingo Zarfı + what-if butonları.
3. **Kask HUD modu**: görüş alanının üst yarısı, minimal (yön, sonraki yol noktası, bingo sayacı, O₂, uyarı), Mars zemini için güvenli renk paleti (siyan/beyaz/magenta; kırmızı yok).

Hedef ödül: **Best Mission Concept** ("en makul konsept ve tasarım"); ikincil Best Use of Science / Best Use of Data.

## 3. Önerilen görev senaryosu (demo hikâyesi)
**Konum: Jezero, Three Forks + Bright Angel.** Gerekçe: tüm veriler hazır (25 cm ortho tile, 1 m DTM, CRISM mineral haritası, MEDA hava, rover izi, 1M görüntü) + iki güncel kanca:
- **Örnek tüpleri geri al**: Three Forks deposundaki 10 tüpün PDS'teki gerçek koordinatları (research-science-eva.md §1). Ocak 2026 bütçesi MSR'ı desteklemiyor → "tüpleri astronotlar toplayacak" güncel ve etkileyici anlatı.
- **Cheyava Falls'u yeniden ziyaret et**: NASA'nın Eylül 2025'te "potansiyel biyoimza" dediği kaya; Kasım 2026'da organik karbon doğrulandı.
Alternatif/ek: Gale boxwork (sayfada NASA'nın kendi örneği) — ikinci konum olarak "üreteç" niteliğini kanıtlamak için.

Demo akışı (30 sn / 7 slayt): habitat → ROI seç (Three Forks) → rota ve Bingo Zarfı → yürüyüş başlar, zaman şeridi → **SEP uyarısı** gelir → sistem en yakın sığınağı ve kısaltılmış rotayı önerir → marjla dönüş → özet (toplanan örnek, alınan doz, kalan O₂).

## 4. Özellik öncelikleri (özgünlük × fizibilite × jüri etkisi)
### Katman A — Bizi farklılaştıran çekirdek (mutlaka)
1. **Bingo Zarfı**: her adımda Dijkstra ile "buradan dönebilir miyim" izokronu. Girdiler: O₂ 0.08–0.12 kg/h nominal, 0.18 zor; 30 dk rezerv; Mars-Tobler hız (Tobler × 0.5–0.7 giysi faktörü, tavan ~4 km/h); Pandolf/Santee metabolik denklemi (ağırlık ×0.38). Apollo "en uzak noktaya önce git" sıralaması.
2. **Açıklanabilir geçilebilirlik maliyeti**: eğim (Horn), pürüzlülük (TRI), Golombek kaya olasılığı (termal ataletten k), kum bayrağı (düşük TI + parlak); her hücrede katkı çubuğu. Eşikler kaynaklı: <10° kolay, 10–15° dikkat, 15–20° zor, >25° yasak (Perseverance 15–20°'de kaydı).
3. **Radyasyon katmanı**: DEM'den gökyüzü görüş faktörü → göreli doz (RAD 0.21–0.33 mGy/gün tabanı; %19 gökyüzü kapatma ≈ %4–8 azalma kalibrasyonu). **SEP modu**: MAVEN SEP/DONKI zaman çizelgesinden simüle uyarı → "sığınağa süre" haritası (habitat, rover, DEM çıkıntıları).
4. **Yürütme modu + what-if**: toz fırtınası (hız −%30, görüş), giysi sızıntısı (O₂ ×3), eş yaralandı (yarı hız), rover arızası (geri yürüyüş) → anında yeniden rota / iptal önerisi. BASALT/Minerva'nın tespit ettiği "plan↔zaman çizelgesi↔yeniden planlama" boşluğu tam burası.

### Katman B — Güçlü destekleyiciler (zaman kalırsa, her biri 1–3 saat)
5. **Sol saati + ışık gecikmesi + röle geçişi paneli**: Mars24 (LMST/LTST/Ls), tek yön gecikme 3–22 dk, "mesajın Dünya'ya varış saati", sonraki orbiter geçişi.
6. **Çevre zaman şeridi**: MEDA klimatolojisinden saatlik sıcaklık (−83 → +5 °C), toz şeytanı penceresi (11:00–14:00), UV indeksi, toz mevsimi bayrağı (Ls 180–360) → "en iyi EVA penceresi" önerisi (SkySense 2025 kazanan örüntüsü).
7. **Bilim değeri ısı haritası**: jeolojik birim (USGS GeoJSON) × CRISM mineral × güncel keşif yakınlığı × erişilebilirlik; bilim vs. marj Pareto kaydırıcısı.
8. **Eş + rover koordinasyonu**: iki astronot ikonu, karşılıklı görüş hattı, maksimum ayrılma alarmı, rover = mobil sığınak → zarfı genişletir (SUITS FY27 "canlı varlık konumları" gereksinimi).
9. **POV önizleme**: yol noktasına yakın Navcam/Mastcam-Z ham görüntüleri (site/drive eşleşmesi) → "varınca bunu göreceksin".
10. **Köken etiketleri**: her katmanda Observed / Derived / Modelled / Assumed rozeti + DEM dikey hata bandı. Jüri Validity için altın.

### Katman C — "Üreteç" kanıtı
11. Herhangi bir lat/lon için düşük çözünürlüklü mod: MOLA 463 m + TES kaya bolluğu + SWIM buz → aynı motor çalışır (Gale boxwork ile göster).

## 5. Veri kullanım listesi (Space Agency Data alanı için hazır)
Optik: HiRISE 25 cm (Trek), CTX 5 m (arcgis) · Topografik: USGS Jezero 1 m DTM, MOLA-HRSC 200 m · Termal: THEMIS gece IR / termal atalet 100 m · Spektral/kimyasal: CRISM Jezero mineral haritası, TES mineral haritaları · Atmosferik: MEDA, REMS, InSight API, MCD · Radyasyon/uzay havası: MSL RAD, MAVEN SEP (CDAWeb HAPI), DONKI · Jeofizik: SWIM buz, MGS manyetizma · Yer gerçeği: M20/MSL yol noktaları + ham görüntü API · Jeoloji: USGS SIM 3292 GeoJSON. (≥3 tür şartı fazlasıyla karşılanır.)

## 6. 48 saatlik iş bölümü önerisi (4–6 kişi)
- **Saat 0–4 (hepimiz)**: tasarım kararları; Leaflet EPSG:4326 + Trek/arcgis tile'lar ayakta; Jezero 1 m DTM bbox'ı `/vsicurl/` ile indirilip slope/aspect/TRI/sky-view hesaplanıp küçük raster JSON/PNG'ye dönüştürülür (tek kişi, Python).
- **Harita/ön yüz (2 kişi)**: katman paneli, rota çizimi, Bingo Zarfı görselleştirme, HUD modu, köken rozetleri.
- **Motor (1–2 kişi)**: maliyet rasterı, Dijkstra/A*, tüketilebilir modeli, what-if senaryoları — saf JS/TS, sunucusuz, çevrimdışı çalışır (Mars'ta Dünya linki yok!).
- **Veri/bilim (1 kişi)**: MEDA → klimatoloji JSON, RAD → doz JSON, MAVEN SEP zaman çizelgesi, Three Forks tüp koordinatları, geoloji GeoJSON, ham görüntü pinleme.
- **Hikâye (1 kişi, baştan)**: 7 slayt / 30 sn video, proje sayfası metinleri, referans listesi, "Use of AI" beyanı. Jüri kılavuzu Presentation'ı eşit ağırlıkta sayıyor.
- **Saat 36–48**: yeni özellik yok; tek akışı cilala, demo kaydını 3 kez prova et.

## 7. Riskler ve önlemler
- DTM 1.84 GB → sadece 3×3 km bbox penceresi çek (~10 MB).
- CORS (mars.nasa.gov JSON) → build zamanında çekip repo'ya göm.
- "Canlı" iddiası yapma; MEDA/RAD 6 ay gecikmeli → "klimatoloji / referans" diye etiketle.
- LLM'i güvenlik mantığına sokma.
- Birimler: boylam 0–360 vs −180–180, areoid vs yarıçap yüksekliği; R = 3396190 m.

## 8. Doğrulanması gerekenler (normal tarayıcıda 5 dk)
- 2026 Project Submission Guide: 7 slayt / 30 sn limiti ve alan listesi aynı mı? https://www.spaceappschallenge.org/resources/project-submission-guide/
- Yerel etkinlik teslim saati.
