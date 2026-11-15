# ARA RAPOR 3 — Dış Göz İncelemesi, Uygulanan Düzeltmeler ve Eklemeler
Proje: **Martian Map** (NASA Space Apps 2026) · Tarih: 2026-11-15

İki bağımsız inceleme yapıldı (her biri sistemi ilk kez gören ajanlar):
1. **Ürün tasarımcısı gözüyle** (ekran görüntüleri + arayüz kaynak kodu)
2. **Space Apps jürisi + Mars EVA operasyon bilimcisi gözüyle** (brief, raporlar, motor kodu, veri hattı)

---

## 1. İncelemelerin ana bulguları
### Tasarım (dış göz)
- **Karar gömülüydü.** GO/CAUTION 13 px'lik bir haptı; "dönüşü olmayan nokta" sıradan bir tablo satırıydı; walk-back marjı hiçbir yerde tek sayı olarak yoktu.
- **Harita yeşildi.** Varsayılan Güvenlik katmanı sahneyi "çayır" gibi gösteriyordu; magenta veto lekeleri yumuşatma yüzünden bulanıktı; InSight'taki ölçek çubuğu bölgesi hata gibi duran pembe dikdörtgendi.
- **Renk birden fazla anlam taşıyordu:** kehribar = CAUTION + B rotası + numune; nane = GO + sığınak; magenta = NO-GO + hover + pusula iğnesi.
- **Sağ panel 1200 px altında tamamen kayboluyordu** (projektör riski).
- A/B karşılaştırması yan yana değildi; "U" skoru açıklanmıyordu; kuzey oku ve imleç koordinatı yoktu; yön okları yoktu.
- HUD'da başlangıç marjı "+0.720" (bütçeye eşit) kafa karıştırıyordu; pusula iğnesi NO-GO rengindeydi; mini harita görüş alanının alt yarısındaydı.
- Tipografi düz ölçekliydi (9–13 px), her etiket büyük harfli → "AI dashboard şablonu" hissi; gri metin kontrastı AA'nın altındaydı.

### İçerik / geçerlilik (jüri gözü)
Puanlar (5 üzerinden): Impact 4 · Creativity 4 · **Validity 3** · Relevance 3.5 · **Presentation 2.5–3**.
- **Kritik hata:** SEP senaryosu kodda "keşif askıda" diyordu ama hedefler yine geziliyordu.
- Rota hep üsten başlıyordu; "mevcut konumdan yeniden plan" yoktu.
- Orienteering kısıtı bağlayıcı değildi (bütçe 0.6 kg, rota 0.29 kg); süre kısıtı yoktu → optimizasyon görünmüyordu.
- Arazi "sığınakları" gerçek kalkan değil (%3–8 doz düşüşü); gerçek sığınak habitat/rover olmalı.
- POV verisi (13 Navcam karesi, rover izi) diskte duruyordu ama arayüze bağlı değildi.
- Eş astronot ve rover desteği yoktu; EVA saat penceresi, Mars saati/ışık gecikmesi yoktu.
- Kaya yoğunluğu ankrajı Jezero için varsayım; 70:30 "Derived" değil "Policy/Assumed" etiketlenmeli.
- **Dil:** arayüz tamamen Türkçe; küresel jüri için İngilizce şart.

---

## 2. Bu turda uygulananlar
| # | Değişiklik | Kaynak bulgu |
|---|---|---|
| 1 | **Karar bloğu**: 32 px verdict + tek satır gerekçe + **min walk-back marjı (kg ve dk, nerede)** + **dönüşü olmayan nokta** sağ panelin en üstünde; panel hiçbir genişlikte gizlenmiyor | Tasarım P0-1 |
| 2 | **Rota karşılaştırma tablosu A / B / düz çizgi** (mesafe, süre, O₂, min güvenlik, veto hücresi, min marj, V, C, sığınağa maks) + **Δ nominal plana göre** | Tasarım P0-4, İçerik C-6 |
| 3 | **"Neden bu rota?"** üç düz cümle (en zayıf hücre, en dar marj, sığınak mesafesi); atlanan hedefler gerekçesiyle | İçerik C-6 |
| 4 | Varsayılan katman **Taban**; **veto her katmanda** keskin (nearest-neighbour) kenar + tarama; ölçek çubuğu bölgesi gri "veri yok" | Tasarım P0-2/3 |
| 5 | **Renk ayrıştırma**: B planı gri kesikli; bekleme noktaları beyaz kare + nane çerçeve; hover halkası ve HUD göstergeleri beyaz; düşük güvenlik segmentleri renk + çentik | Tasarım P0-6 |
| 6 | **Yön okları** (150 m'de bir), **kuzey oku**, **imleç enlem/boylam**, ölçek çubuğu | Tasarım P0-8 |
| 7 | **Aktif senaryo bandı** harita üstünde; **klavyeli demo modu** (1 nominal · 2 SEP · 3 sızıntı · 4 yaralı · 5 ilerle · 6 sahne · B · L · H · F · P) | Tasarım P0-5, P1-10 |
| 8 | **What-if öncesi/sonrası**: nominal plan hayalet rota olarak kalır, tabloda Δ sütunu | Tasarım P1-9 |
| 9 | **Katman çubuğu** 4 sekme + "Diğer" menüsü + ayrı toggle grubu; **katmana göre lejant** | Tasarım P1-11 |
| 10 | Tipografi token'ları (9–10 px kaldırıldı, `--text-3` #858E97 ≈5:1), büyük harf yalnız başlıklarda | Tasarım P1-12 |
| 11 | **SEP düzeltmesi**: hedefler iptal, **mevcut konumdan** en yakın **gerçek sığınağa** (habitat / basınçlı rover) A*, **sığınağa süre** geri sayımı; astronot zaten sığınaktaysa "SIĞINAKTA" | İçerik B-6, E-1 |
| 12 | **Mevcut konumdan yeniden plan**: EVA ilerleme kaydırıcısı (0–95 %); tamamlanan hedefler düşülür, harcanan O₂/süre devredilir | İçerik A-Validity-2 |
| 13 | **Orienteering'e süre kısıtı** eklendi (O₂ + dakika); atlama gerekçeleri "süre/O₂/düşük değer" | İçerik B-7 |
| 14 | **Rover = gerçek sığınak** (haritada taşınabilir), arazi noktaları "bekleme noktası" olarak yeniden adlandırıldı; "sığınağa en uzak dk" ayrı metrik | İçerik B-4/13, C-4 |
| 15 | **Eş astronot** (60 s geride) karşılıklı görüş hattı DEM üzerinden; profil şeridinde ve HUD'da gösterim | İçerik C-3 |
| 16 | **Perseverance izi** (128 yol noktası, sol 408–709) + **hedefe tıklayınca gerçek Navcam görüntüleri** (sol 663/707/409/538, site/drive eşleşmeli) | İçerik C-1 |
| 17 | **EVA saat penceresi**: 06–18 LTST taraması (gölge, sıcaklık riski, 11–14 toz şeytanı bandı) → önerilen başlangıç | İçerik C-5 |
| 18 | **Mars saati** (Mars24 MSD/LMST) + **Dünya ışık gecikmesi** üst barda; **Ls mevsim** kaydırıcısı güneş deklinasyonuna bağlı | İçerik C-8, B-14 |
| 19 | **HUD yeniden kurgu**: heading tape, bingo **dakika** olarak, geçen/toplam, sığınağa süre, eş LOS, sonraki iki yol noktası, mini harita sağ üstte, **en yakın Navcam karesi arka plan**, Space ile oynatma, 44 px düğmeler | Tasarım P0-7, P2-15 |
| 20 | **Yazdırılabilir cuff checklist** (P tuşu / Ctrl+P): bacaklar, kurallar, dönüşü olmayan nokta, sığınaklar | İçerik C-9 |
| 21 | Köken düzeltmeleri: 70:30 → "politika / varsayım"; Jezero kaya ankrajı → Assumed rozeti; O₂ "metabolik vekil" açıklaması; su "ısı atım eşdeğeri" | İçerik B-1/8/9/10 |
| 22 | Performans: viewshed/yenilik/dönüş-O₂/sığınak alanı önbellekleri; Dial kovalı öncelik kuyruğu (yığından 1.8× hızlı); hücre başına maliyet terimleri önceden hesaplanır; **hedef sıralaması 2 m kaba ızgarada, bacaklar 1 m'de A\***; üsse dönüş bacakları tek ters Dijkstra; B planı A'nın alanlarını kullanır. Node kıyaslaması (gerçek Jezero verisi): 8 s → **soğuk 2.9 s, sıcak 1.8 s**, rota sonucu aynı. | — |

### Test (tarayıcı, 1600×950)
- Nominal Jezero: **GO**, min marj +0.429 kg (286 dk) 1727 m'de, dönüşü olmayan nokta yok, sığınağa ≤ 24 dk; A 2498 m / B 2705 m / düz çizgi 2372 m ama **133 veto hücresi, min S 0**.
- EVA %45 → yeniden plan: 3 hedef tamamlandı, kalan 2 hedef için 1319 m / 73 dk; Δ −1179 m, −114 dk.
- %45'te SEP → **SIĞINAĞA DÖN**, hedefler iptal, habitata 17 dk; HUD'da "SEP — SIĞINAĞA 17 DK".
- Hesap süresi: Jezero (1.44 M hücre) soğuk ≈ 3 s, önbellekli ≈ 2 s (önceki 8–10 s); InSight daha kısa.

---

## 3. Henüz yapılmayanlar (öncelik sırası)
1. **İngilizce arayüz** (TR/EN anahtarı). Küresel jüri için şart; sözlük tabanlı i18n ile 1–2 saat.
2. InSight için gerçek DTM (USGS CTX Ellipse-9 DTM veya HiRISE stereo) → Assumed → Observed.
4. DONKI SEP olay listesi "replay" (10 Eyl 2017) ve gerçek MEDA sıcaklık eğrisi (Modelled → Observed).
5. "En uzak önce" (Apollo) sıralama seçeneği ve numune kütle bütçesi kısıtı DP'de.
6. Jeneratör modu (keyfi enlem/boylam) — README'de hat belgelendi; canlı değil.

---

## 4. Canlı gösterim senaryosu (3 dakika, klavyeyle)
| Adım | Tuş / tıklama | Ne görülür | Söylenecek cümle |
|---|---|---|---|
| 1 | Açılış (Jezero) | GO bloğu, A/B/düz çizgi tablosu, Perseverance izi | "Mars Trek gezegeni gösterir; biz astronota sonraki 2 km'yi ve eve dönüp dönemeyeceğini gösteriyoruz." |
| 2 | L (katman döngüsü) | Güvenlik → Bilim → Arazi | "Dört NASA verisi 1 m ölçekte: HiRISE, USGS DTM, CRISM, Perseverance izi." |
| 3 | Three Forks hedefine tıkla | Sağ altta sol 663 Navcam kareleri | "Varınca göreceğiniz manzara: Perseverance'ın tam bu noktadan çektiği görüntü." |
| 4 | Tabloya bak | Düz çizgi 133 veto hücresi, min S 0 | "Düz çizgi 133 yasak hücreden geçer; A yalnız %5 daha uzun ve hiç girmez." |
| 5 | 5 (ilerle) | Astronot işareti, 3 hedef tamam, Δ sütunu | "Yürüyüşün ortasında yeniden planlıyor: harcanan O₂ ve süre devrediyor." |
| 6 | 3 (sızıntı) | Marj düşer, hedef atlanabilir, gerekçesi yazılır | "Sızıntı tüketimi üçe katlar; hangi hedefi bırakacağını söyler." |
| 7 | 2 (SEP) | SIĞINAĞA DÖN, habitata 17 dk | "Güneş fırtınası: bilim iptal, mevcut konumdan en yakın basınçlı sığınağa." |
| 8 | H, Space | Kask HUD, Navcam arka planı, bingo dakikası, eş LOS | "Vizörde: oksijen marjı dakika olarak, eş astronot görüş hattı, sonraki nokta." |
| 9 | Esc, 1, 6 | InSight sahnesi, CAUTION (düşük veri güveni) | "Aynı motor, başka yer; DTM yoksa kendisi 'dikkat' diyor." |
| 10 | P | Cuff checklist önizleme | "Habitat ekranından vizöre ve bileğe: tek plan." |
