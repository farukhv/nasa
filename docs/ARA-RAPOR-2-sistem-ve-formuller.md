# ARA RAPOR 2 — Kurulan Sistem, Uygulanan Formüller ve Test Sonuçları
Proje: **Interplanetary Survival Guide: Martian Map** · Tarih: 2026-11-15

> Ara Rapor 1 kararları koda döküldü. Bu rapor "programda hangi özellik neden var" sorusunu cevaplar ve
> ekibin V2 formül setinin **uygulanmış hâlini** (as-built) verir. Çalıştırma: `README.md`.

---

## 1. Sistem özeti
```
Yörünge görüntüsü (+DTM, +CRISM) ──► pipeline/build_scene.py ──► 22 kanal PNG + elev.f32 + scene.json
                                                                        │
Tarayıcı (Vite + React + TS) ◄── Web Worker: fields → o2Ret → orienteering DP → A* / Dijkstra → A, B, koridor, sığınak
```
- **İki sahne, aynı motor** ("üreteç" kanıtı): Jezero · Three Forks (1200×1200 hücre, 1 m) ve Elysium · InSight (1106×977 hücre, 0.294 m — ekibin PIA26515 görüntüsü).
- Hesaplar ana iş parçacığını kilitlemez; her ağırlık/senaryo değişikliğinde 350 ms gecikmeyle otomatik yeniden plan.
- Köken etiketleri her katmanda: Observed / Derived / Modelled / Assumed.

## 2. Ön işleme (pipeline) — hücre kanalları
| Kanal | Nasıl üretildi | Köken |
|---|---|---|
| **K** kaya yoğunluğu (%) | 7 px pencere doku (std, Laplace, gradyan) + **güneş yönlü parlak→gölge çift** tespiti; dalga bastırma (yapı tensörü >0.7). Yörünge tespitleri gürültülü olduğundan **yayınlanmış yüzey sayımlarına ankrajlı**: InSight %1.5 arka plan / %5 tepe (Golombek 2020), Jezero %5 / %25 | Derived (ankrajlı) |
| **E** eğim (°) | Jezero: 1 m DTM gradyanı (dx 0.949 m, dy 1 m). InSight: krater çanaklarından sözde-DEM (d/D 0.08) | Derived / **Assumed** |
| **CLS** sınıf | toprak · anakaya (8–26° yar yüzeyleri) · kayalık (k≥%10) · blok (k≥%25) · kum dalgası (tutarlılık>0.5 & parlak, ≥6 m blob) · krater kenarı | Derived |
| **Z** zemin direnci | sınıf tablosu (5/15/25/35/80/45) + dalga şiddeti | Derived |
| **SVF** gökyüzü görüş | Zakšek 2011, 16 yön, 60 m, 4× alt örnek | Derived |
| **HZ0–7** ufuk açısı | 8 azimutta → herhangi güneş açısı için gölge | Derived |
| **G, DK, F** bilim | sınıf→maruziyet; 15 m ton entropisi + sınıf çeşitliliği; TRI + krater kenarı + kontrast | Derived |
| **H** hidrasyon | CRISM baskın mineraloji (36 m): smektit/karbonat 85–95, olivin+smektit 70–78, olivin 45–50, piroksen 35–40, yok 20 | **Observed** (Jezero) / Assumed 25 (InSight) |
| **Q, DV, M, P, LK** güven | yerel kontrast; veri yeterliliği (DTM var 88 / yok 42); doku-K ile DTM pürüzlülüğü uyumu; kenar kararlılığı; konum doğruluğu (90 / 62) | Derived |
| Kraterler | karanlık (güneş tarafı duvar) → parlak (karşı duvar) çifti, kompaktlık testi; InSight 98, Jezero 83 | Derived |

Sınıf payları: Jezero toprak %42 · anakaya %24 · kayalık %23 · kum %11; InSight toprak %97 (Golombek 2020 "düz, %1–4 kaya" ile uyumlu).

## 3. Motor — uygulanan formüller (as-built)
### 3.1 Hücre puanları
- **S_i = 100 − (0.25·K_risk + 0.20·E_risk + 0.20·Z + 0.10·R + 0.15·O + 0.10·T) − 5·gölge − 10·LOS-yok**, `max(0,·)`
  - K_risk: kaya % → tehlike (0→0, 5→15, 10→30, 20→55, 40→85, 60→100) [Golombek takılma bandı]
  - E_risk = 100·eğim/30°; **O = 100·1.2·O_dönüş(i)/O_tank** (ters Dijkstra ile üsse dönüş O₂'si — "oksijen durumu" terimi bu şekilde mekânsallaştırıldı)
  - R = 50·(1 − 0.3·(1−SVF)) (+40·doz SEP'te) · T: ekip formülü, t_i = T_hava(LTST) + 15·sin(güneş yük.) (güneşte) / −10 (gölgede)
- **Veto:** eğim>25° ∨ kaya>%40 ∨ Z>85 ∨ R>80 ∨ T>90 ∨ veri yok. Acil/SEP modunda R-vetosu gevşetilir.
- **V_i = 0.30G + 0.20DK + 0.25F + 0.15N + 0.10H**; N = en yakın görev hedefine 100·exp(−d/60 m)·değer
- **C_i = 0.25(Q−15·gölge) + 0.25DV + 0.20M + 0.20P + 0.10LK**; C_POI = C hücre değeri (prize ağırlığı)

### 3.2 Adım maliyetleri
- **ΔO = 0.033 kg/km · d · f(θ) · (1+β_sınıf) · (1+0.006·W_numune) · η**, f = 1+3.5·tanθ (yukarı), max(0.85, 1−1.5·tanθ) sonra artış (aşağı); β = [0.10, 0.05, 0.30, 0.45, 0.80, 0.50]; η = 1 + 0.05·(h−4)⁺, yaralı ×1.3, sızıntı ×3
- Hız: Tobler×0.6, tavan 4 km/h, /(1+0.6β), yaralı ×0.5, τ>3 yavaşlatır · Su: 0.00127 kg/h/W, W = 100 + 3300·(kg O₂/h)
- **Plan maliyeti = d·[1.0·f_toplam + w_s·3·(100−S_j)/100 + w_v·(1−V_j/100)]** — negatif ödül yok (A* kabul edilebilirliği); w_s:w_v = 0.7:0.3; RTB/SEP'te w_v=0
- Walk-back: **O_kalan ≥ 1.2·O_dönüş(p)**; ilk ihlal = "Dönüşü olmayan nokta" (haritada sekizgen, profilde magenta bant)

### 3.3 Rota üretimi
1. Hedef sıralama: üs + her hedeften erken-çıkışlı Dijkstra → O₂ matrisi → **Held–Karp bitmask DP** (≤8 hedef), kısıt Σ ≤ bütçe/1.2, amaç Σ V_POI·C_POI; atlanan hedefler nedeniyle listelenir
2. **A rotası** = bacakların birleşimi; her noktada S/V/C, O₂, su, zaman, marj, konum belirsizliği (LOS'ta sıfırlanır; 0.3 m + 0.035·d veya IMU: 0.005·t²)
3. **B planı** = A'nın en zayıf halkası (min S) 12 m yarıçapla vetolanır + A'nın 20 m tamponunda maliyet ×4 (örtüşme >%40 ise ×8, ×16); Jaccard örtüşme raporlanır
4. **Koridor** = jeodezik tüp; yarıçap r = clamp(r_konum + 5 m·(100−S)/100, 1.5, 25 m); veto hücrelerinden taşmaz
5. **Sığınaklar** = rota boyunca zaman örnekleri → 25 dk sınırlı Dijkstra → en iyi H = 0.45S + 0.35(100−SVF) + 0.20·üs yakınlığı; ters çok-kaynaklı Dijkstra ile her noktada "sığınağa dk"
6. Puanlar: **S_rota = 0.6·min + 0.4·ort**, V_rota = ΣV_POI/V_hedef, C_rota = 0.5·min+0.5·ort, **U = 0.6S + 0.4V**; C<65 → Düşük Veri Güveni Uyarısı
7. Karar: NO-GO (dönüşü olmayan nokta ∨ S=0) · CAUTION (uyarı var ∨ S<60) · GO

## 4. Test sonuçları (tarayıcı, 2026-11-15)
| Sahne | Hedef | A rotası | B planı | Karar | Süre (worker) |
|---|---|---|---|---|---|
| Jezero · Three Forks | 5/5 seçildi, sıra TF→ROCKS→RIPPLE→SCARP→CRATER | 2498 m · 187 dk · O₂ 0.287 kg · S 63 (min 53) · V 100 · C 71 · U 78 · 2 sığınak, maks 13 dk | 2705 m · O₂ 0.298 · S 66 · U 80 · örtüşme %1 | **GO** | 9.7 s (ilk), B için sığınak yeniden kullanımı sonrası daha kısa |
| Elysium · InSight | 5/5, HOLLOW→EJECTA→C2→C1→CRATER | 783 m · 89 dk · O₂ 0.137 · S 77 · C **56** | 868 m · örtüşme %3 | **CAUTION** (düşük veri güveni — DTM yok) | 6.5 s |
- Jezero: veto %4.8, iletişim görüş hattı dışı %25.8 (delta yarlarının arkası), gölge %0 (LTST 10:30).
- InSight: ölçek çubuğu alanı "veri yok" vetosu; krater kenarları sınıf 5.
- SEP senaryosu: keşif askıya alınır, w_v=0, radyasyon ağırlığı ×3; düz ovada bile sığınak/dönüş rotası üretilir (ilk sürümde tüm sahne vetolanıyordu; düzeltildi).
- Kask HUD: O₂, bingo marjı, sonraki yol noktası yönü/mesafesi, sığınağa süre, konum ±, mini harita, EVA ilerleme kaydırıcısı.

## 5. V2 spesifikasyonundan sapmalar (bilinçli)
| V2 | Uygulanan | Neden |
|---|---|---|
| Cost − w_v·V | + w_v·(1−V/100) | Negatif kenar A*/Dijkstra'yı bozar; bilim POI katmanında toplanır |
| α·tan²θ (α=4.5) | 1+3.5·tanθ | Minetti 2002 ölçeği; tan² 10°'de +%14 ile fazla iyimser |
| γ=0.015/kg | 0.006/kg | Hareketli kütle 140–210 kg |
| R_i mutlak 0–100 | SVF'ye göre göreli, SEP'te +40 | Düz arazide her şeyin vetolanmasını önler |
| O_durum tanımsız | 1.2·O_dönüş/O_tank | Mekânsal, ölçülebilir |
| Sıcaklık bandı | Korundu; sürücü PLSS ısı atımı notu | Ara Rapor 1 §3 |

## 6. Sınırlar ve dürüstlük notları
- Kaya yoğunluğu yörüngeden **göreli**dir; mutlak değerler yüzey sayımlarına ankrajlı (scene.json'da yazılı). Troy tipi ince kabuk altı kum yörüngeden görülmez → güven kanalı bunu düşük DV ile yansıtır.
- InSight sahnesinde DTM yok: eğim/SVF/yükseklik **Assumed**; sistem bunu C_rota<65 uyarısıyla kendisi söyler.
- Güneş geometrisi basit (deklinasyon 0, Ls yok); MEDA sıcaklık eğrisi modeldir (Modelled).
- Soğutma suyu: 6 mbar'da süblimatör marjinal → "soğutma tüketilebilir (varsayılan teknoloji)".
- Sığınak = DEM'den düşük gökyüzü görüşlü, güvenli hücre; gerçek radyasyon kalkanı sağlamaz (göreli %4–8 doz düşüşü).
- Mastcam-Z ve WATSON görüntülerinin PIA eşleşmeleri "en olası" olarak etiketlendi.

## 7. Sunum alanlarına eşleme
- **Space Agency Data:** HiRISE (Trek WMTS + PIA26515), USGS HiRISE DTM, CRISM (Zenodo, Parente ekibi), PDS tüp koordinatları, Golombek/InSight yüzey sayımları, RAD/MEDA literatür değerleri.
- **Use of AI:** Claude ile araştırma sentezi, kod ve raporlama; **rota mantığı deterministik** (LLM yok); tüm ağırlıklar `config.ts`'te kaynaklı.
- **Demo akışı:** Jezero → 5 hedef → A/B → koridor & sığınaklar → SEP aç → acil mod → InSight'a geç → "üreteç" kanıtı + düşük güven uyarısı → HUD.

## 8. Önerilen sonraki adımlar (önem sırası)
1. Jezero sahnesine Perseverance iz/yol noktaları (M20_waypoints.json) ve Cheyava Falls için ikinci pencere.
2. Sığınak aramasını kaba ızgarada çalıştırıp süreyi <3 s'ye indirmek; viewshed'i üs değişmedikçe önbelleğe almak.
3. HUD'da "en uzak önce" (Apollo) sıralama seçeneği; eş-astronot ikinci konum ve karşılıklı LOS.
4. Gerçek HiRISE DTM'si olan ikinci bir InSight sahnesi (ESP_036761_1845 stereo çifti) ile Assumed→Observed yükseltmesi.
5. 7 slayt / 30 sn demo videosu ve proje sayfası metinleri.
