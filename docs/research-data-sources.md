# Araştırma Raporu 3 — Doğrulanmış Mars veri kaynakları ve API'ler (2026-11-14)
Etiketler: [WEB-EASY] doğrudan tile/GeoJSON/JSON · [MEDIUM] tek GeoTIFF/CSV, bir kez ön işleme · [HEAVY] ham PDS (tek site için, saat başlamadan).
"✔" = bugün curl ile HTTP 200 doğrulandı.

## 1. Taban haritalar ve tile'lar [WEB-EASY]
### Mars Trek WMTS
- Doküman: https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars (anahtar yok)
- Şablon: `https://trek.nasa.gov/tiles/Mars/EQ/{LAYER}/1.0.0/default/default028mm/{z}/{y}/{x}.{png|jpg}`; z0 = 2×1 → Leaflet `L.CRS.EPSG4326` doğrudan çalışır. Cesium: `WebMapTileServiceImageryProvider` + `GeographicTilingScheme`, yarıçap 3396190 m.
- Doğrulanmış katman ID'leri:
  - `Mars_Viking_MDIM21_ClrMosaic_global_232m` (jpg) ✔
  - `Mars_MGS_MOLA_ClrShade_merge_global_463m` (jpg) ✔
  - `Mars_MGS_MOLA_DEM_mosaic_global_463m_8` ✔
  - CTX 5 m global: tile'lar **`https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}`** ✔ (trek yolu 404)
  - **`JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd`** Jezero HiRISE 25 cm (77.223–77.584E, 18.307–18.669N) ✔
  - `Jezero_CTX_BlockAdj_dd` (~6 m) ✔ · `Gale_CTX_BlockAdj_dd` ✔
- THEMIS/HRSC ID'leri Trek UI'nin network sekmesinden alınmalı (katalog API'si yok). Eksik tile 404 → `errorTileUrl`.
### OpenPlanetaryMap
- `https://cartocdn-gusc.global.ssl.fastly.net/opmbuilder/api/v1/map/named/opm-mars-basemap-v0-2/all/{z}/{x}/{y}.png` ✔ (maks ~z7)
### USGS mozaikler [MEDIUM] — S3 range request destekli → `/vsicurl/` ile bbox penceresi oku, indirme yok
- MOLA DEM 463 m: https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif ✔
- MOLA+HRSC blend 200 m: https://planetarymaps.usgs.gov/mosaic/Mars/HRSC_MOLA_Blend/Mars_HRSC_MOLA_BlendDEM_Global_200mp_v2.tif ✔
### USGS pygeoapi GeoJSON [WEB-EASY]
- `https://astrogeology.usgs.gov/pygeoapi/collections/mars/hirise-observation-footprints-equatorial/items?f=json&bbox=77,18,78,19`

## 2. Hiper-yerel optik + topografya
- **HiRISE DTM** (1–2 m, PDS3 .IMG float32, GDAL açar): https://www.uahirise.org/dtm/ ; bbox ile bulma (JSON): `https://oderest.rsl.wustl.edu/live2/?query=product&results=m&output=JSON&target=mars&ihid=MRO&iid=HIRISE&pt=DTM&loc=f&minlat=18&maxlat=19&westernlon=77&easternlon=78` ✔
- **USGS STAC** (COG, CC0): kök `https://stac.astrogeology.usgs.gov/api` (sonda / yok!); koleksiyonlar `mro_hirise_socet_dtms`, `mro_ctx_controlled_usgs_dtms`, `mo_themis_controlled_mosaics`; arama `/api/search?collections=mro_hirise_socet_dtms&bbox=77,18,78,19`
- **Jezero hazır** ✔: DTM 1 m `https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif` (1.84 GB); ortho 25 cm `.../JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first.tif` (7.36 GB — Trek'te zaten tile'lı, gerek yok)
- **Gale** ✔: DEM 1 m `https://planetarymaps.usgs.gov/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif` (3.87 GB) ; ortho 25 cm 23 GB → sadece vsicurl
- CTX Murray Lab: https://murray-lab.caltech.edu/CTX/V01/tiles/ (4°×4° GeoTIFF) — web için arcgis tile yeter
- HRSC HMC-30 bölgesel DTM: Jezero/Gale'i KAPSAMIYOR → MOLA-HRSC blend kullan
- **Öneri: Jezero** (25 cm tile + 1 m DTM + CTX + canlı rover izi + MEDA + CRISM mineral haritası hepsi açık)

## 3. Termal & spektral
- THEMIS Day/Night IR 100 m: https://www.mars.asu.edu/data/ (`thm_nir_100m` gece IR ≈ kaya bolluğu vekili)
- THEMIS termal atalet 100 m (Fergason 2006), 30°×60° tile'lar (.cub ~600 MB): Jezero → 00N060E, Gale → 30S120E/00N120E, örn. https://astrogeology.usgs.gov/search/map/themis_thermal_inertia_mosaic_quantitative_30s060e_100mpp
- TES küresel (küçük dosyalar): termal atalet 8 ppd, Putzig&Mellon 2007 20 ppd, albedo, toz örtüsü indeksi, **mineral haritaları 4 ppd** (hematit, olivin, piroksen, ...) https://pds-geosciences.wustl.edu/missions/mgs/tes-timap.html
- CRISM MTRDR [HEAVY]; **Jezero kısayolu**: baskın mineraloji haritası (CC-BY, 1.8 MB) https://zenodo.org/records/5575824 (`jezeroFinal.tif`); ayrıca https://data.mendeley.com/datasets/b39x2kfbj4

## 4. Hava, radyasyon, iklim
- **MEDA (Jezero)** CSV ✔: `https://pds-atmospheres.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/sol_XXXX_YYYY/sol_NNNN/` (DER_PS basınç, DER_RHS nem, DER_TIRS yüzey/hava T, data_calibrated_env: ATS, WS rüzgâr, RDS UV). ~6 ay gecikme (sol ~1500'e kadar). Canlı JSON yok → sol başına klimatoloji JSON'u önceden hesapla.
- **REMS (Gale)** ✔: `https://atmos.nmsu.edu/PDS/data/mslrem_1001/DATA/SOL_xxxxx_yyyyy/SOLnnnnn/` (RMD = türetilmiş çevre)
- **InSight API** ✔ (tarihsel, demo için): `https://api.nasa.gov/insight_weather/?api_key=DEMO_KEY&feedtype=json&ver=1.0`
- **RAD** [HEAVY→CSV'ye çıkar]: `https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/` (INDEX/INDEX.TAB ✔, DOCUMENT/RAD_RDR_SIS.HTM). Perseverance'ta RAD yok → "Mars yüzey referansı" olarak göster, basınçla ölçekle.
- **Mars Climate Database** (klimatoloji, "tahmin benzeri"): http://www-mars.lmd.jussieu.fr/mcd_python (form; nazik ol)
- Toz fırtınası: MARCI MDGM (1.1 TB) https://astrogeology.usgs.gov/search/map/mars_mro_marci_daily_global_weather_maps_pds4_archive ; MSSS haftalık raporlar https://www.msss.com/msss_images/ ; MCS DDR https://atmos.nmsu.edu/data_and_services/atmospheres_data/MARS/mcs.html
- **Uzay havası**: CDAWeb HAPI ✔ anahtar yok: `https://cdaweb.gsfc.nasa.gov/hapi/data?id=MVN_SEP_L2_S1-CAL-SVY-FULL&time.min=2024-05-20T00:00Z&time.max=2024-05-22T00:00Z&format=json` (MAVEN SEP; `MVN_INSITU_KP-4SEC`). **DONKI** [WEB-EASY]: `https://api.nasa.gov/DONKI/CME?startDate=...&api_key=` (Mars'ı etkileyen CME'leri filtrele). M2M SWAO: https://science.gsfc.nasa.gov/m2m-swao

## 5. Yeraltı, jeofizik
- **SWIM** ✔ (3 km/px, lon 0–360E!, −60..60, nodata −30, değer −1..+1): `https://swim.psi.edu/output/SWIM2/Global/Composite/SWIM2_c0_1.tif` (0–1 m, 71 MB), `SWIM2_c1_5.tif`, `SWIM2_c_5.tif`; veri seti katmanları `.../Datasets/` ; https://swim.psi.edu/SWIM2Products.php . Jezero/Gale'de ≈0/negatif → dürüst "burada yüzeye yakın buz yok".
- SHARAD radargramlar [HEAVY]: https://sharad.psi.edu/
- Kabuk manyetizması: Connerney 2005 1°×1° https://mgs-mager.gsfc.nasa.gov/publications/pnas_102_42_connerney/data/pnas_102_42_connerney_data.html ("pusula güvenilmez" EVA açısı)
- Gravite GMM-3: https://pgda.gsfc.nasa.gov/products/57 (düşük getiri)

## 6. Rover verisi (yer gerçeği) [WEB-EASY] ✔
- **Perseverance iz/yol noktaları** (GeoJSON CRS84): `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json` (sol, site, drive, lon, lat, elev_geoid, tilt, dist_total_m, images[]), `M20_traverse.json`, `M20_waypoints_current.json` (sol ~2022, ≈45.2 km), `m20_heli_waypoints.json`, `m20_heli_flight_path.json`
- **Curiosity**: `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json`, `MSL_traverse.json`, `MSL_waypoints_current.json`
- CORS garantisi yok → build zamanında çek ya da küçük proxy. MMGIS açık kaynak (Apache-2.0): https://github.com/NASA-AMMOS/MMGIS (tüm yığın olabilir)
- **Ham görüntü API** ✔: `https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=50&page=0&order=sol+desc` (sol, site, drive, LMST, kamera, mastAz/El, image_files{small..full_res}); filtre `&search=NAVCAM_LEFT|MCZ_RIGHT`, `&condition_2=sol:1000:gte&condition_3=sol:1010:lte`. Curiosity: `category=msl`. site/drive ile yol noktasına bağla. (api.nasa.gov mars-photos ÖLÜ.)
- NASA Image Library: `https://images-api.nasa.gov/search?q=jezero`
- Mastcam-Z 3D: resmi indirme yok; kendi mesh'ini 1 m DTM + 25 cm ortho ile three.js'te üret (örnek https://rkinnett.github.io/rover3d)

## 7. Jeoloji & vektörler [WEB-EASY]
- **USGS SIM 3292 küresel jeoloji** GeoJSON ✔: `https://services.arcgis.com/nzS0F0zdNLvs7nc8/ArcGIS/rest/services/Mars_Geology_feature_layer/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson&geometry=77,18,78,19&geometryType=esriGeometryEnvelope&inSR=104971`
- Jezero fotojeolojik harita (Stack et al.): https://authors.library.caltech.edu/records/a7qs5-xhq84 ; Gale SIM 3464: https://pubs.usgs.gov/sim/3464/
- IAU isimler: https://planetarynames.wr.usgs.gov/

## 8. ML arazi veri setleri
- **AI4Mars** (soil/bedrock/sand/big rock): https://zenodo.org/records/15995036 (17.8 GB; msl alt kümesi küçük)
- DoMars16k (CTX yer şekilleri 15 sınıf): https://zenodo.org/record/4291940
- Ucuz ML'siz: `gdaldem slope/roughness/TRI` + THEMIS gece IR + HiRISE ton → maliyet rasterı → A*

## 9. Önerilen 48 saatlik yığın
1. Leaflet (EPSG:4326) ya da Cesium (Mars elipsoidi); Trek MOLA/Viking + arcgis CTX + Jezero 25 cm HiRISE [0 ön işleme]
2. Jezero 1 m DTM → `/vsicurl/` bbox → `gdaldem slope/hillshade/aspect` → `gdal2tiles -p geodetic` ya da TiTiler COG [1–2 h]
3. THEMIS gece IR + termal atalet tile 00N060E; TES mineral/albedo/toz [1–2 h]
4. Zenodo Jezero CRISM mineral haritası → tile [30 dk]
5. MEDA CSV → Ls/yerel saat klimatoloji JSON; MCD senaryo sayıları; InSight canlı demo [2–3 h]
6. RAD → günlük doz JSON; MAVEN SEP HAPI + DONKI "uzay havası uyarısı" zaman çizelgesi [2–3 h]
7. SWIM 0–1 m → tile [30 dk]
8. M20 yol noktaları/iz + rss/api görüntüleri site/drive ile pinle [1–2 h]
9. ArcGIS jeoloji GeoJSON Jezero bbox [30 dk]

## 10. Tuzaklar
- Boylam: USGS/Trek −180..180; SWIM & çoğu PDS 0..360E. Yükseklik: MOLA/HiRISE areoid; rover `elev_radii` yarıçap. Küre R=3396190 m; SRS `IAU_2015:49910` / `+proj=longlat +R=3396190`.
- CORS: trek/arcgis tile'lar `<img>` için sorunsuz; mars.nasa.gov JSON ve PDS dizinleri değil → build-time fetch/proxy.
- Gecikme: MEDA/REMS/RAD ~6 ay; MAVEN haftalar; rover izi neredeyse gerçek zamanlı.
