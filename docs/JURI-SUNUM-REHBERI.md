# Jüri Sunum Rehberi — Martian Map
Sunum: https://claude.ai/artifact/R7PcExRX7E6uWSfkHecfnh (19 slayt) · Program: `cd app && npm run dev` → http://localhost:5173

Bu rehber dört şey içerir: süre planı, slayt slayt konuşma, canlı gösterim sırası, zor sorular ve proje sayfası metinleri.

---

## 1. Süre planı
Sunumun tamamı yaklaşık 7 dakika, canlı gösterimle 9 dakika. Süre kısaysa aşağıdaki kısaltmaları kullanın.

| Süre | Hangi slaytlar | Atlananlar |
|---|---|---|
| **9 dk (tam)** | 1–19 + canlı gösterim | — |
| **5 dk** | 1, 2, 3, 5, 7, 11, 12, 14, 15, 17, 19 | 4, 6, 8, 9, 10, 13, 16, 18 |
| **3 dk** | 1, 2, 3, 7, 11, 14, 19 | diğerleri; canlı gösterim yerine slayt 14 ve 15 |
| **7 slayt (teslim sınırı)** | 1, 3, 5, 7, 11, 14, 17 | — |

Bacak başına hedef süre (tam sürüm): Çıkış 1:15 · Veri 2:00 · Motor 2:00 · Olay 1:15 · Dönüş 0:45.

---

## 2. Slayt slayt konuşma (her biri 15–30 saniye)
Konuşmacı notları sunumun içinde de var; burada tek cümlelik özleri.

| WP | Slayt | Söylenecek öz |
|---|---|---|
| 01 | Kapak | "Mars Trek gezegeni gösterir. Biz astronota önündeki iki kilometreyi gösteriyoruz ve bir karar veriyoruz." |
| 02 | Problem | "Bugünkü araçlarla çıkış öncesi kontrol listesinin üç kutusu da boş: ölçek, insan, karar." |
| 03 | Çözüm | "Aynı liste, bu kez dolu. Programın çıktısı harita değil, sağ üstteki GO." |
| 04 | Veri katmanları | "Beş katman üst üste biniyor; dördü doğrudan ölçüm, biri model ve öyle etiketli." |
| 05 | HiRISE analizi | "Uydu görüntüsünü altlık olarak değil veri olarak kullanıyoruz: fotoğraf, arazi, tehlike." |
| 06 | Ölçek cetveli | "Uydu yalnız en sağdaki bir metrelik kayayı görür; astronotu soldaki küçükler düşürür. Aradaki köprü Golombek modeli." |
| 07 | Perseverance | "Varınca ne göreceğim: rover o noktadan fotoğraf çekmiş, biz hedefe bağladık." |
| 08 | Kendimizi sınadık | "Dört noktanın üçünde uydu tahmini yerdeki dokuyla aynı sırada. Dört nokta kanıt değil; damgada yazıyor." |
| 09 | Hücre puanları | "Her metrekarenin üç notu var: güvenlik, bilim, güven. Taralı blok veto: bilim ne olursa olsun geçilmez." |
| 10 | Rota motoru | "Beş adım: sıra, rota, B planı, koridor, sığınak. Hepsi kural tabanlı." |
| 11 | Düz çizgiye karşı | "Düz çizgi 131 yasak hücreden geçer. Bizim rota sıfır; bedeli yüzde beş daha uzun yol." |
| 12 | Walk-back | "Apollo'nun geri yürüme kuralı, her adımda: kalan oksijen dönüş için gerekenin 1.2 katından az olamaz." |
| 13 | Saat penceresi | "Aynı rota her saatte aynı güvenlikte değil; sistem 07:30 başlangıcını öneriyor." |
| 14 | Master caution | "Yürüyüşün ortasında güneş fırtınası: bilim iptal, mevcut konumdan sığınağa 17 dakika." |
| 15 | Vizör | "Şu an astronotun vizöründen bakıyorsunuz. Arka plan gerçek Navcam karesi." |
| 16 | Başka bir yer | "Aynı motor ekibin kendi fotoğrafında. Arazi modeli yok; sistem kendisi 'dikkat' diyor." |
| 17 | Dürüstlük cetveli | "Solda ölçtüklerimiz, sağda varsaydıklarımız. Zayıf noktalarımızı biz söylüyoruz." |
| 18 | Makine dairesi | "1.44 milyon hücre, tarayıcıda, sunucusuz, üç saniye." |
| 19 | Dönüş | "Harita girdi, karar çıktı. Şimdi canlı gösterelim." |

---

## 3. Canlı gösterim (2 dakika, klavyeyle)
Önce programı açın ve ilk planın bitmesini bekleyin (GO görünene kadar, yaklaşık 3 saniye). Fareyle haritaya bir kez tıklayın ki klavye odakta olsun.

| Adım | Tuş | Ne olur | Ne söylenir |
|---|---|---|---|
| 1 | (açılış) | GO, rota, karşılaştırma tablosu | "Beş hedef, bir rota, bir karar." |
| 2 | L, L, L, L | Güvenlik → Bilim → Arazi → Taban | "Dört katman aynı sahnede." |
| 3 | Three Forks hedefine tıkla | Sağ altta Navcam kareleri | "Varınca göreceği manzara." |
| 4 | 5 | Astronot işareti, 3 hedef tamam, farklar tabloda | "Yürüyüşün ortasındayız; buradan yeniden planlıyor." |
| 5 | 2 | SIĞINAĞA DÖN, sığınaklar kırmızı | "Güneş fırtınası: bilim iptal, sığınağa 17 dakika." |
| 6 | H, sonra Boşluk | Vizör görünümü oynar | "Astronotun gördüğü." |
| 7 | Esc, 1, 6 | InSight sahnesi, CAUTION | "Başka bir yer; arazi modeli yok, sistem kendisi uyarıyor." |

Yedek: bir şey takılırsa slayt 14 (fırtına) ve 15 (vizör) aynı hikâyeyi ekran görüntüsüyle anlatır.

---

## 4. Zor sorular ve hazır cevaplar

**"Yörüngeden kaya yoğunluğunu nasıl biliyorsunuz?"**
Uydu yalnız bir metreden büyük kayaları çözer. Golombek'in boyut dağılımı modeli büyük kaya sayısından küçüklerin kapladığı alanı verir. Mutlak ölçeği yayınlanmış yüzey sayımına bağlıyoruz: InSight için ölçülmüş (Golombek 2020), Jezero için varsayım ve arayüzde öyle etiketli. (Slayt 6 ve 17.)

**"Bunu doğruladınız mı?"**
Dört yol noktasında Navcam karelerindeki zemin dokusuyla karşılaştırdık; üçünde sıralama tutuyor, r = 0.64. Dört nokta kanıt değil gösterge; sahnede 128 yol noktası var ve yöntem hazır. (Slayt 8.)

**"Neden güvenlik 70, bilim 30?"**
Yapı literatürden: önce kısıtlar, sonra bilim (Apollo walk-back kuralı, BASALT uçuş kuralları, Desert RATS). 70'e 30 sayısı bir politika seçimi; arayüzde kaydırıcıyla değişir ve rota anında yeniden hesaplanır.

**"Sığınak dediğiniz yerler gerçekten korur mu?"**
Hayır, ve bunu biz söylüyoruz. Arazi içindeki bekleme noktaları radyasyonu yalnızca yüzde 3 ile 8 düşürür. Gerçek sığınak habitat ve basınçlı rover; fırtınada rota onlara çizilir. Ayrıca Mars atmosferi güneş parçacık olaylarını Ay'a göre çok zayıflatır; kural yine de yürüyüşü bitirip sığınağa dönmektir.

**"Yapay zekâ rotayı mı çiziyor?"**
Hayır. Rota mantığı kural tabanlı ve tekrarlanabilir: aynı girdi, aynı rota; karar günlüğü her adımı yazar. Yapay zekâyı araştırma sentezinde, kod yazımında ve raporlamada kullandık.

**"Oksijen gerçekten sınırlayıcı mı? CO₂, batarya, soğutma?"**
Oksijeni metabolik vekil olarak kullanıyoruz; aynı metabolik hız CO₂, ısı ve soğutma yükünü de sürer. Soğutma suyu ayrıca izleniyor. Mars basıncında süblimatör marjinal olduğu için bunu "ısı atım eşdeğeri, teknoloji varsayım" diye etiketledik.

**"InSight sahnesinde eğimi nereden buldunuz?"**
Bulmadık. O sahnede gerçek arazi modeli yok; eğim krater çanaklarından türetilmiş bir varsayım. Sistem bu yüzden veri güvenini 56 olarak hesaplıyor ve kendisi CAUTION veriyor. Sıradaki iş gerçek arazi modelini eklemek.

**"Rakiplerden farkınız ne?"**
Çoğu proje katman yığını ve kısa yol algoritması. Bizde katmanlar girdi, karar çıktı: tüketilebilir modeli, walk-back zarfı, yürüyüşün ortasında yeniden planlama, sığınağa süre ve veri güveni rotanın içinde.

**"Gerçek bir görevde çalışır mı?"**
Mimari buna göre: sunucusuz, çevrimdışı, tarayıcıda üç saniye. Eksikler belli ve yazılı: gerçek zamanlı konum girdisi, ölçülmüş atmosfer verisi, daha geniş doğrulama.

---

## 5. Proje sayfası metinleri

**Başlık:** Martian Map — Astronot için hiper-yerel EVA rotası ve karar desteği

**Kısa özet (yüksek seviye):**
Martian Map, bir Mars astronotunun yüzey yürüyüşünü planlayan ve yürüyüş sırasında karar veren bir araçtır. HiRISE uydu görüntüsü, 1 metrelik arazi modeli, CRISM mineral haritası ve Perseverance yer gerçeğini birleştirir; her metrekare için güvenlik, bilim ve güven puanı hesaplar. Çıktısı bir harita değil, bir karardır: GO, CAUTION ya da NO-GO; yanında rota, B planı, oksijen marjı ve sığınağa süre.

**Ayrıntılı açıklama (iskelet):**
1. *Problem.* Mevcut haritalar küresel ölçekte; tek bir yürüyüşün alanı için katmanlanmış, insan fizyolojisini içeren bir karar aracı yok.
2. *Nasıl çalışır.* Python hattı görüntüden kaya yoğunluğu, arazi sınıfı, eğim, gölge ve görüş hattı çıkarır. Tarayıcıdaki motor hedefleri oksijen ve süre bütçesi içinde sıralar, yasak hücrelere girmeyen rotayı ve B planını bulur, her noktada geri yürüme kuralını denetler.
3. *Olaylar.* Giysi sızıntısı, yaralı eş, toz ve güneş fırtınasında mevcut konumdan yeniden planlar; fırtınada bilimi iptal edip sığınağa yönlendirir.
4. *Üç görünüm.* Habitat planlama ekranı, kask vizörü, yazdırılabilir bilek listesi.
5. *Dürüstlük.* Her katman kökenini taşır; veri güveni düşükse sistem kendisi uyarır.

**Kullanılan uzay ajansı verisi:**
- HiRISE 25 cm ortho mozaik, Jezero (NASA Mars Trek WMTS) ve HiRISE ESP_085514_1845 / PIA26515 (InSight)
- USGS HiRISE 1 m arazi modeli, Jezero (Mars 2020 TRN ürünleri, CC0)
- CRISM baskın mineraloji haritası (Parente, Itoh, Saranathan; Zenodo 5575824)
- Perseverance yol noktaları ve izi (JPL MMGIS), Navcam ham görüntüleri (mars.nasa.gov ham görüntü arşivi), Three Forks örnek tüpü koordinatları (PDS)
- Yöntem ve kalibrasyon: Golombek ve Rapp 1997; Golombek ve diğ. 2020 (InSight yüzey sayımı); MSL RAD ve MEDA yayınları

**Yapay zekâ kullanımı:**
Claude (Anthropic) araştırma sentezinde, kod yazımında, grafik ve sunum üretiminde kullanıldı. Rota ve karar mantığı deterministik kurallardan oluşur; içinde dil modeli çalışmaz. Görseller NASA kaynaklıdır, yapay zekâ ile görsel üretilmemiştir.

**Kaynaklar:** `docs/ARA-RAPOR-1`, `2`, `3` ve `docs/research-*.md` dosyalarındaki listeler.
