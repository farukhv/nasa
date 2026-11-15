# ARA RAPOR 1 — Gereksinim Analizi, Araştırma Bulguları ve Mimari Kararlar
Proje: **Interplanetary Survival Guide: Martian Map** (NASA Space Apps 2026)
Tarih: 2026-11-15 · Hazırlayan: Claude (5 paralel araştırma alt ajanı + ana oturum)

> Bu rapor, ekibin gönderdiği gereksinim metnini ve V2 formül setini inceler; iddiaları literatürle test eder; kodda kullanılacak **nihai ağırlıkları ve düzeltmeleri** gerekçeleriyle verir. Her sayının yanında köken etiketi var: **[K]** kaynaklı, **[T]** kaynaklı formülden türetilmiş, **[V]** mühendislik varsayımı (arayüzde ayarlanabilir).

---

## 1. Ekibin gönderdiği dosyaların kimliği ve kullanılabilirliği

| Dosya | Kimlik | Kullanım kararı |
|---|---|---|
| `PIA26515.tif` (+ aynı görüntünün WhatsApp kopyası) | **HiRISE, MRO — "HiRISE Studies the Dust on InSight"**, 23 Eki 2024 (ESP_085514_1845). InSight iniş yeri, Homestead hollow, Elysium Planitia, **4.502°N 135.623°E**, −2613 m. Ölçek çubuğundan ölçülen **0.294 m/px** (100 m ≈ 340 px) → sahne ≈ **325 × 287 m**. | **KULLANILIYOR — Sahne B.** Gerçek yörünge görüntüsü, hiper-yerel EVA ölçeği. DTM yok → eğim "Türetilmiş (gölge/krater)" etiketiyle, düşük güvenle. Golombek 2020 kalibrasyonu: kaya bolluğu %1–4, 2 m RMS eğim 2.9°, termal atalet ~166. |
| `PIA05049.tif` | **Spirit Pancam "Mars in Full View"**, Oca 2004, Gusev krateri (14.57°S 175.47°E). 360° yer panoraması. | Harita değil; **POV / "varınca ne göreceğim" katmanı** ve kaya yoğunluğu görsel sınıfı örneği olarak kullanılacak. |
| WhatsApp 08.20.24 | Perseverance Mastcam-Z panoraması, Jezero krater kenarı (en olası: **PIA26644 "Falbreen"**, Mayıs 2025 veya Neretva Vallis PIA26816). Dağınık koyu kayalar + düz tepe. | POV katmanı ve "kayalık ama yürünebilir" sınıf örneği. |
| WhatsApp 08.20.25 | WATSON aşındırma yaması; ışınsal çizgiler + beyaz feldspat benekleri + çatlak. En olası **PIA26576 "Kenmore"** (sol 1526, Haz 2025). Işınsal çizgiler büyük olasılıkla aşındırma izidir (kristal değil). | "Bilimsel hedef kartı" örneği: ekipte yanlış yorumlanmasın diye not düşüldü. |

**Ek veri (internetten, gerçek, doğrulandı):**
- **Jezero HiRISE 25 cm ortho** (Mars Trek WMTS, z17 ≈ 0.32 m/px) ✔ indirildi — Three Forks örnek deposu çevresi 1.2 × 1.2 km.
- **Jezero 1 m HiRISE DTM** (USGS, CC0) ✔ aynı pencere uzaktan okundu (80 s). Eğim p50 4.4°, p90 14°, p99 29° → delta önü yarları gerçekten var.
- **CRISM baskın mineraloji haritası** (Parente/Itoh/Saranathan, Zenodo 5575824, CC-BY, 36 m/px) ✔. Pencerede: Olivin+Smektit (yüksek güven) baskın, olivin, yüksek-Ca piroksen.
- **Three Forks 10 tüp koordinatları** (PDS CSV, santimetre doğruluğunda) → gerçek bilimsel hedefler.

**Sonuç:** Sistem iki sahneyle gelir: **Sahne A — Jezero / Three Forks** (optik + topografik + spektral + rover yer gerçeği = 4 veri türü, ≥3 şartı sağlanır) ve **Sahne B — Elysium / InSight** (ekibin fotoğrafı; "üreteç" kanıtı: aynı motor başka görüntüde çalışır).

---

## 2. "Kayalık yol bilimsel, toprak yol güvenli" iddiasının testi

### 2.1 Bulgular [K]
- **Kısmen doğru, iki ayrım şart.** Bilimsel değer **yerinde kayadan (outcrop/bedrock)** gelir; dağınık "float" kayalar bağlamını kaybetmiştir. Perseverance'ın 30 numaralı örneğinin **27'si kaya karotu, 2'si regolit** (Atmo Mountain, Crosswind Lake), 1'i atmosfer. Three Forks deposu: 7 kaya karotu, 1 regolit, 1 atmosfer, 1 tanık tüp. → Örnekleme çabasının ~%90'ı kayaya gitmiş.
- **"Pürüzsüz = güvenli" sadece sıkı toprak için doğru.** Gevşek kum, dalgalanma (ripple) ve ince kabuk altı kum **batma** tehlikesidir: Spirit "Troy"da (2010) kalıcı saplandı, Opportunity "Purgatory"de (2005) haftalarca kaldı. Kumda yürüme enerjisi sert zeminin **1.6–2.5 katı** (Lejeune 1998). AI4Mars sınıflandırması: toprak+anakaya = geçilebilir; kum+büyük kaya = geçilemez.
- **Kaya tehlikesi metriği:** Golombek modeli F_k(D)=k·exp[−q(k)·D], q=1.79+0.152/k. Yürüyen astronot için tehlikeli bant **10–30 cm** (takılma/bilek) ve **>30 cm** (basamak). Hesap [T]: k=%5 → tehlike bandı alan payı ~%2; k=%20 → ~%6; k=%40 → ~%11 ve >0.3 m kayalar alanın %21'i (fiilen yürünemez).
- Apollo düşmeleri: A16'da 12, A17'de 9 düşme; çoğu yaralanmasız ama engebeli/kraterli zemin ve iş yüküyle ilişkili → düşme riski maliyeti haklı.
- Termal atalet düzeltmesi: **TI<150 = toz** (kum değil); kum 200–350; >1200 anakaya (Fergason 2006).

### 2.2 Nihai sınıf tabloları (koda giren değerler)

| Arazi sınıfı | Güvenlik cezası (0–100) | Bilimsel değer (0–100) | Güven notu |
|---|---|---|---|
| Sıkı toprak / regolit | **5** | **25** | iMOST: regolit toz/ISRU/toksisite için öncelikli, sıfır değil |
| Anakaya kaldırımı (düz) | **10** | **90** (katmanlı/kontaklı) | Örnekleme kaydı: 27/30 karot |
| Kaya yoğunluğu %5 | 15 | 35 | |
| Kaya yoğunluğu %10 | 30 | 45 | |
| Kaya yoğunluğu %20 | 55 | 60 | |
| Kum dalgası / kumul | **60** | 20 | Troy/Purgatory; 1.6–2.5× enerji |
| Krater kenarı / ejekta | **70** | 75 | Derin malzeme ama blok+dik duvar |
| Kaya yoğunluğu %40 | **85** | 65 | Çoğu float; yürünemez |

**Sert veto (ceza değil duvar):** eğim > 25°, kaya > 0.5 m, kumul kayma yüzü.

### 2.3 Güvenlik/bilim oranı
**w_s : w_v = 70 : 30** varsayılan [K: Apollo walk-back kuralı, BASALT uçuş kuralları, Desert RATS — önce kısıtlar, sonra bilim]. 60:40 yalnızca zaten güvenli koridor içinde seçilebilir (arayüzde kaydırıcı; 70:30'un altına inince "bilim öncelik modu" rozeti çıkar). 70:30'da bilim, cezası ≥55 olan bir hücreye ancak kazanç 2.3× ise girebilir.

Ekibin "önce güvenli, sonra bilim, sonra güven" sıralaması literatürle **uyumlu**; biz bunu **leksikografik + ağırlıklı** yapıya çevirdik: (1) sert vetolar ve walk-back zarfı, (2) 70/30 maliyet, (3) güven ayrı gösterge (puan içine karışmaz; <65 ise uyarı).

---

## 3. V2 formül setine düzeltmeler (gerekçeli)

| Konu | Ekibin değeri | Karar | Gerekçe |
|---|---|---|---|
| O₂ taban tüketimi | 0.08–0.12 kg/h nominal, 0.18 zor | **0.09 nominal, 0.15 zor, 0.18 acil üst sınır**; düz zeminde **0.033 kg/km** | Apollo PLSS 1200 BTU/h ort., 2000 tepe → 0.090 / 0.15 kg/h [T] |
| Eğim cezası α·tan²θ, α=4.5 | 10°'de yalnız +%14 | **Yokuş yukarı f=1+3.5·tanθ; aşağı f=1+1.0·|tanθ| (−10%'dan dikte ek artış); >25° veto** | Minetti 2002: %17.6 eğimde 2.85× (1 g); 0.38 g ölçeğinde 1.5–1.7× [T] |
| Zemin direnci β=0.6 | tek değer | **sınıfa göre: anakaya/sıkı 0–0.1, kayalık 0.2–0.4, kum 0.6–1.0** | Lejeune 1998 |
| Numune yükü γ=0.015/kg | fazla yüksek | **γ=0.006/kg** | Maliyet toplam hareketli kütleyle (80 kg + 60–130 kg giysi) ölçeklenir; Pandolf yük terimi |
| Yorgunluk η | tanımsız | **η=1.0 (≤4 h), sonra +%5/saat; yaralı eş ×2 (hız ×0.5)** [V] | Standart yok; Apollo sınırlayıcısı el/kol yorgunluğu |
| Soğutma suyu | yok | **0.37 kg su / 1000 BTU; ≈0.00127 kg/h per W; 7–8 h'de 2.7–3.6 kg; kapasite 3.9 kg** | Süblimasyon 2.83 MJ/kg; EMU uygulaması 3.6 kg/EVA. **Not:** Mars'ta 6 mbar ≈ üçlü nokta → süblimatör marjinal; arayüzde "soğutma tüketilebilir (varsayılan teknoloji)" yazılacak |
| Sıcaklık bandı −20..+20 °C | T_i=0 bandı | **Korundu ama anlamı değişti:** ortam bandı eldiven/batarya/soğuk temas uyarısı için; asıl sürücü PLSS ısı atımı (metabolik ısı / kapasite) | EMU dış sınırları ~−156..+121 °C; 6 mbar'da konveksiyon düşük |
| Yürüme hızı | — | Tobler × 0.6 giysi faktörü, tavan 4 km/h; walk-back 3.3 km/h (Apollo kuralı) | |
| IMU sapması | Δx ∝ t² | **r_IMU(t)=0.005·t² m (1 mg bias); PDR+güneş sensörü: r(d)=0.035·d + r₀; UWB r₀≈0.3 m; her LOS/işaret fix'inde sıfırlanır** | Woodman 2007; Foxlin 2005; MER güneş bulma 0.5–2° |
| Toz opaklığı τ | eklenecek | **β=τ/10500 1/m; görüş=3.912/β (τ=0.5→86 km, τ=3→14 km, τ=10→4 km); güneş faktörü exp(−0.35·max(0,τ−0.5)/μ); UHF/X-band etkilenmez; kamera kalite cezası 1−exp(−β·menzil)** | Koschmieder; Lemmon 2004/2015; Guzewich 2019 |
| SEP uyarı süresi | — | **30 dk varsayılan "sığınağa süre"** [V]; Mars atmosferi (16–22 g/cm²) <150 MeV protonları durdurur → yüzey SEP riski Ay'dan düşük, yine de 2017 olayı doz hızını 2× yaptı | Hassler 2018 |
| Radyasyon R_i | 0–100 mutlak | **Göreli:** R=50·doz_rel(SVF) normal; SEP modunda +40 → açık arazi 90 (veto), siperli ~75. Acil dönüş modunda R-vetosu gevşetilir (hareket etmek zorunlu). | Ehresmann 2021: %19 gökyüzü kapanması → %4–8 doz düşüşü |
| Numune kütlesi | 10–15 kg | **Yürüyüş EVA'sı başına tavan 20 kg** (Apollo yürüyüş EVA'ları 17–21 kg) | Lunar Sample Compendium |
| Bilim ödülü −w_v·V | negatif maliyet | **Yasak:** A*/Dijkstra'yı bozar. Bunun yerine "ceza yokluğu": +w_v·(1−V/100); asıl bilim toplama POI/orienteering katmanında | Algoritma raporu |

---

## 4. Algoritma kararları
1. **A\*** 8-komşu, yönlü (asimetrik) maliyet, octile sezgisel × f_min (yokuş aşağı minimum) → kabul edilebilir kalır; köşe kesme yasak.
2. **Plan B:** İteratif ceza yöntemi (Johnson 1992; Akgün 2000): birincil rotanın R=20 m tamponunda maliyet ×4, uçlarda 10 m muaf; Jaccard örtüşme >0.4 ise k ikiye katlanır. Ek "zayıf halka" varyantı: birincilin en düşük S segmenti vetolanıp yeniden çözülür → B planı, A'nın tek zayıf noktasından kaçar (jüriye anlatması kolay).
3. **Koridor ("dairesel dairesel" çizim isteği):** tek çizgi değil, **jeodezik tüp**: her rota noktasında yarıçap r=clamp(r_nav(t)+kS·(100−S)/100·5 m, 1.5, 25 m); veto hücrelerinden geçmeyen çok kaynaklı Dijkstra büyütmesi → duvardan taşmaz; dar yerlerde "kısıtlı koridor" bayrağı.
4. **Güvenli duraklar (sığınak):** aday puanı H=0.45·S+0.35·(1−SVF)·100+0.20·yakınlık; S≥80, eğim<10°; ters Dijkstra ile "sığınağa süre"; rota zamanı üstünde açgözlü aralık örtüsü; 3–5 durak, hedef ≤25 dk.
5. **Çoklu hedef (3–8 POI):** n+1 tam Dijkstra ile maliyet matrisi; **bitmask DP (Held–Karp) ile orienteering**: O₂ bütçesi/1.2 içinde en yüksek güven-ağırlıklı bilim; "en uzak önce" Apollo kuralı; birleşik rota üstünde noktasal walk-back kontrolü.
6. **Walk-back:** üsten **ters kenarlı** tek Dijkstra ile O_dönüş alanı; her noktada O_kalan ≥ 1.2·O_dönüş; ilk ihlal = **dönüşü olmayan nokta**, haritada işaretlenir.
7. **Yeniden planlama:** D* Lite yerine Web Worker'da A* yeniden çalıştırma (1200² grid ≈ 0.3–0.6 s).
8. **Kaya yoğunluğu (K):** 7 px pencere yerel std + Laplace varyansı + gradyan enerjisi + **parlak-gölge çifti** (güneş azimutu yönünde) yoğunluğu; dalgalanma bastırma (yapı tensörü tutarlılığı >0.7 → %50); p2–p98 gerdirme; "Türetilmiş (doku vekili)" etiketi.
9. **Gökyüzü görüş faktörü:** Zakšek 2011, 16 yön, R=60 m, 4× alt örneklenmiş DEM; **viewshed**: üsten Bresenham ışınları (anten 2.5 m, astronot 1.7 m).

---

## 5. Arayüz kararları (Mars'tan türetilmiş palet)
- **Renk = durum.** Krom nötr bazalt grisi (#0E1114 / #151A1F / #1D242B); metin sıcak kâğıt beyazı (#E8E2D6, 13.6:1).
- **Mars paleti:** regolit #BE7850, toz #D9A877, umber #6B4430, gölge #2A1B14, gökyüzü #C9A27E, günbatımı halesi #6FA3D8, bazalt #4A5560.
- **Semantik:** GÜVENLİ nane #5FE3B0 · DİKKAT kehribar #FFC23D · YASAK **magenta** #FF4FA8 (Mars zemininde kırmızı/turuncu kullanılmaz; kırmızı yalnız abort) · BİLİM siyan #4FD8FF · İLETİŞİM beyaz #F4F7F9. Bilim ısı rampası cividis (durum renkleriyle ton çakışmaz).
- **Ölçülen bulgu:** hiçbir parlak vurgu tan zemin üstünde 3:1'e ulaşmıyor → tüm harita katmanları **koyu kılıf (2–3 px #0E1114)** veya koyu plaka üstünde; etiketler asla çıplak değil.
- **Tipografi:** IBM Plex Sans + IBM Plex Mono (telemetri için `tabular-nums slashed-zero`); etiketler 11–12 px büyük harf, 0.06–0.1 em aralık.
- **Düzen:** harita tam ekran; sol ray rota/bacaklar; alt şerit profil (yükseklik+eğim / O₂-su-süre / GO-NO-GO çubuğu); sağ üst kart görev saatleri + tüketilebilirler; **üç seviye hiyerarşi** (tek büyük GO/CAUTION/NO-GO → sayılar → etiketler). Apollo cuff checklist'i gibi çizgili tablolar; 2–4 px köşe, gradyan/glassmorphism yok.
- Birincil rota kalın düz; B planı ince kesikli; koridor yarı saydam bant + "±12 m, güven 0.82" metni; aktif yol noktası magenta halka.
- Erişilebilirlik: durumlar şekil (daire/üçgen/sekizgen) ve tarama deseniyle de ayrılır; ≥44 px dokunma hedefi; `prefers-reduced-motion`.

---

## 6. Sistem mimarisi
```
pipeline/ (Python)   fetch_jezero.py  → tile + DTM + CRISM penceresi
                     build_scene.py   → özellik rasterları (K,E,Z,SVF,gölge,sınıf,Q,...) PNG + scene.json
app/ (Vite+React+TS) engine/  grid, A*, Dijkstra (ters), koridor, sığınak, orienteering DP, tüketilebilir modeli
                     workers/ planner.worker.ts (hesap ana iş parçacığını kilitlemez)
                     ui/      Harita (Canvas), katman paneli, rota kartları, profil şeridi, what-if, HUD modu
data/scenes/<ad>/    base.jpg, channels/*.png, scene.json, pois.json
docs/                bu raporlar + nihai formül dokümanı
```
Ağırlıklar ve katsayılar `app/src/engine/config.ts` içinde tek yerde; arayüzden canlı değiştirilebilir, her değişiklik rotayı yeniden hesaplar ve "Neden bu değer?" açıklama kartı kaynaklarıyla görünür.

## 7. Açık sorular (ekibe)
1. Sahne A'da üs/habitat konumunu **Three Forks'un ~400 m doğusundaki düz zemine** koyuyoruz (varsayım). Farklı bir konum ister misiniz?
2. Sunum formatı: tablet (planlama) + kask HUD modu ikisi de yapılıyor; jüri demosunda hangisi önde olsun?
3. Mastcam-Z panoraması ve Kenmore yaması için POV kartlarında PIA numaralarını "en olası eşleşme" olarak yazacağız; ekipte kesin kaynağı bilen varsa düzeltilsin.
