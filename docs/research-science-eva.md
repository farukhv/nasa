# Araştırma Raporu 1 — Mars EVA bilimi, geçilebilirlik, radyasyon, insan faktörleri (2026-11-14)

## 1. Güncel bilim kancaları (2024–2026)
- **Cheyava Falls / "Sapphire Canyon"** (Jezero, Bright Angel formasyonu, Neretva Vallis ağzı, ~18.47°N 77.37°E yaklaşık): 21 Tem 2024 karotu; vivianit+greigit "leopar benekleri" + organik karbon; NASA 10 Eyl 2025'te "potansiyel biyoimza" dedi. Hurowitz et al., Nature 645 (2025) doi:10.1038/s41586-025-09413-0. Kas 2026: yüzeyin hemen altında kompleks organik karbon doğrulandı.
- **Three Forks örnek deposu** (10 tüp, 28 Oca 2023, yükseklik ≈ −2545 m) — PDS CSV: https://pds-geosciences.wustl.edu/m2020/urn-nasa-pds-mars2020_sample_depot_three_forks/miscellaneous/sample_metadata/sample_tube_locations.csv
  Malay 18.45262651,77.40775601 · Mageik 18.4525234,77.40784692 · Crosswind Lake 18.45267034,77.408056 · Roubion 18.45276569,77.40807823 · Coulettes 18.45272365,77.4082 · Montdenier 18.45281322,77.40824352 · Bearwallow 18.45272753,77.40833585 · Skyland 18.45300487,77.4085047 · Atsah 18.45306554,77.40860064 · Amalik Witness 18.45337179,77.40844668
  Tüpler 5–15 m aralıklı zigzag. Ocak 2026 bütçe tasarısı MSR'ı desteklemiyor → "astronotlar tüpleri toplasın" güncel anlatı kancası.
- **Krater kenarı kampanyası**: Lookout Hill (Ara 2024), Witch Hazel Hill, **Krokodillen** (~30 ha kil platosu, Noachian) https://www.jpl.nasa.gov/news/nasas-perseverance-mars-rover-to-take-bite-out-of-krokodillen/ ; Summerland Trail'de 15–20°+ otonom tırmanış (2025); sol 1720 kenar dışı; 2026 Mala Mala / Arathusa / Lac de Charmes; odometre >45 km.
- **Curiosity boxwork** (Mount Sharp, ~4.75°S 137.37°E yaklaşık): sırtlar 1–2 m, ağ 10–20 km; sol 4534 (7 May 2025) giriş; sırtlarda kil, çukurlarda karbonat (Şub 2026). https://www.jpl.nasa.gov/news/nasas-curiosity-mars-rover-starts-unpacking-boxwork-formations/
- **Uzun zincirli alkanlar** (Cumberland, Yellowknife Bay): Freissinet et al. PNAS 2025.
- **Mevsimsel metan**: 0.41 ppbv taban, gece; barometrik pompalama → şafak öncesi "koklama penceresi" (Ortiz 2024).
- **RSL/eğim çizgileri kuru** (Bickel & Valantinas 2025) → "toz çığı eğilimli yamaç" tehlike katmanı.
- **SWIM yeraltı buzu** swim.psi.edu: 60°S–60°N, ~3 km/px, derinlik sınıfları 0–1/1–5/>5 m.
- **Mağaralar**: USGS MGC3 ~1029 aday; lav tüpü içinde ~%82 doz azalması (analog). https://www.usgs.gov/news/caves-mars

## 2. Geçilebilirlik / maliyet haritası (48 saatte yapılabilir)
- Veri: USGS HiRISE DTM STAC https://stac.astrogeology.usgs.gov/docs/data/mars/hirise_dtms/ ; Jezero HiRISE DTM mozaik (5.3 GB) https://astrogeology.usgs.gov/search/map/mars-2020-jezero-crater-landing-site-products ; Gale 1 m DEM github.com/GALE-Lab/Mars_DEMs ; MOLA 463 m / MOLA-HRSC 200 m.
- Mars Trek WMTS: `https://trek.nasa.gov/tiles/Mars/EQ/{Layer}/1.0.0/default/default028mm/{z}/{y}/{x}.jpg` (örn. `Mars_MGS_MOLA_ClrShade_merge_global_463m`), API doc https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars , katalog https://api.nasa.gov/mars-wmts/catalog. Cesium Mars (Eyl 2025): küresel arazi + Jezero/Gale 3D tiles.
- DEM'den türetilecek katmanlar: eğim (Horn 3x3) → <10° kolay, 10–15° dikkat, 15–20° zor, >25° yasak; pürüzlülük (TRI); adım tehlikesi >0.3 m; bakı → güneşli/gölgeli.
- **Golombek kaya modeli**: F_k(D)=k·exp[−q(k)·D], q(k)=1.79+0.152/k; k (TES termal atalet) tipik %5–40. https://ntrs.nasa.gov/citations/20030111177
- Kum tuzakları/TAR: düşük termal atalet (<150) + parlak + dalgalı = yumuşak kum; Opportunity Purgatory (2005), Spirit Troy (2009).
- Görüş hattı (viewshed) → iletişim ölü bölgeleri; gökyüzü görüş faktörü → radyasyon kalkanı.
- Yol planlama: 8-komşulu A*/Dijkstra, anizotropik eğim maliyeti. NASA ICES 2025 traverse aracı aynısını yapıyor: https://ntrs.nasa.gov/api/citations/20250001829/downloads/ICES%202025%20TraverseModel.pdf ; MIT SEXTANT (Marquez/Newman) mesafe/zaman/enerji optimizasyonu.
- Metabolik model (Pandolf/Santee): Ṁ[W]=1.5W+2.0(W+L)(L/W)²+η(W+L)(1.5V²+0.35·V·G); Mars'ta ağırlık terimleri ×0.38; giysi 80–100 kg. Apollo 10 km geri yürüyüş testi: 6.3 km/h, 96 dk, O₂ ≈0.18 kg/h.
- Hız-eğim: Tobler W=6·exp(−3.5|S+0.05|) km/h; "Mars-Tobler" = Tobler × 0.5–0.7 giysi faktörü, tavan ~4 km/h (varsayım olarak etiketle).
- Tüketilebilirler/bingo: xEMU O₂, CO₂, su, batarya ≥8 h; acil purge 2540 g/h 54 dk; xEVA ConOps maks. geri yürüyüş 8 h; kural: O₂ 0.08–0.12 kg/h nominal, 0.18 zor; bingo = dönüş süresi×hız + 30 dk rezerv. Her adımda küçülen "erişilebilir zarf" izokronu.

## 3. Radyasyon ve çevre
- MSL RAD: GCR 0.21 (güneş maks.) – 0.325 mGy/gün (güneş min.); doz eşdeğeri 0.64±0.12 mSv/gün; Nis 2013 SEP ~50 mSv/gün. Tepe yanında %19 gökyüzü kapatma → %4–8 doz düşüşü (Ehresmann 2021 doi:10.1029/2021JE006851). → DEM gökyüzü görüş faktörü ≈ göreli doz haritası (taban ~%50).
- Toz mevsimi: Ls 180–360; küresel fırtınalar Ls 185–300; 2018 GDS Ls 185→193→tepe 205 (τ 8.5). Afelyon Ls 0–180 temiz.
- Sıcaklık Jezero: yüzey −83 °C → +5 °C; günlük genlik ~60 K.
- MEDA: yamaç rüzgârları sol başına 2 kez tersine döner; Jezero en yüksek toz şeytanı oranı; tepe 11:00–14:00 LTST.
- UV: REMS 200–380 nm; "Mars UV indeksi" = güneş zenit açısı × τ (Beer-Lambert).
- "Güvenli sığınak katmanı" = habitat+rover+mağara adayları+DEM çıkıntıları, seyahat süresi izokronlarıyla.

## 4. İnsan faktörleri / arayüz
- NASA SUITS FY27 gereksinimleri: giysi+biyomedikal veri, 2D harita + canlı ekip/rover konumları, 3D harita opsiyonel, sesli asistan. https://www.nasa.gov/wp-content/uploads/2026/08/fy27-nasa-suits-mission-description.pdf
- CHI 2024 Ay HUD çalışması: öğeler görüş alanının üst yarısında; AR yol noktası + minimap kombinasyonu; fazla AR dikkat dağıtıyor → minimal.
- Renk: Mars zemini ~RGB(190,120,80); uyarılarda kırmızı/turuncu kaçın; siyan/beyaz/magenta; desen yedekliliği.
- POV: Mastcam-Z panoramalar https://mastcamz.asu.edu/mastcam-z-data-for-all/ ; "Explore with Perseverance" 3D sahne.

## 5. İletişim ve zaman
- Tek yön ışık gecikmesi 3.0–22.3 dk; kavuşum karartması ~2 hafta/26 ay. Araç "yerleşik uçuş direktörü" olmalı.
- Röle: UHF 2 Mbps, geçiş ~8 dk, 2–4/sol; MAVEN 6 Ara 2025'ten beri sessiz, 3 Haz 2026 sonlandırıldı. https://science.nasa.gov/mars/mars-relay-network/
- Mars24: MSD=(JD_TT−2405522.0028779)/1.0274912517; MTC=(24·MSD) mod 24; LMST=MTC−λ_W/15; sol=88775.244 s; Python `marstime`.

## Sıralı 10 özellik fikri
1. Canlı **Bingo Zarfı** (küçülen git-dön izokronu)
2. **Gökyüzü-görüş radyasyon kalkanı katmanı + SEP sığınak bulucu**
3. **Açıklanabilir geçilebilirlik maliyet haritası** (hücre başı katkı dökümü)
4. **"Örnekleri topla" görevi** Three Forks gerçek koordinatları + Cheyava Falls ziyareti
5. **Sol saati + ışık gecikmesi + röle geçiş paneli**
6. **Çevre zaman şeridi** (sıcaklık, toz şeytanı penceresi, UV, toz mevsimi) → EVA saati önerisi
7. **What-if yeniden planlayıcı** (toz fırtınası, giysi sızıntısı, yaralı eş, rover arızası)
8. **Bilim değeri ısı haritası** (jeolojik birim × güncel keşif × erişilebilirlik)
9. **Eş & rover koordinasyonu** (karşılıklı LOS, maks. ayrılma alarmı, rover = mobil sığınak)
10. **Kask HUD modu** + yol noktalarında Mastcam-Z panorama önizlemesi
