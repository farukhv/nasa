# Martian Map

**Mars'taki astronotlar için hiper-yerel EVA rota planlama ve karar desteği.**
NASA Space Apps Challenge 2026 · *Interplanetary Survival Guide: Martian Map*

[English](README.md)

Martian Map gerçek yörünge verisini bir yürüyüş planına çevirir. Sahnenin her metrekaresi için zeminin ne kadar güvenli olduğunu, ne kadar bilimsel değer taşıdığını ve verinin ne kadar güvenilir olduğunu puanlar. Ardından birden çok bilimsel hedefi oksijen, soğutma suyu ve süre bütçesi içinde sıralar; ana rotayı, yedek rotayı, güvenli koridoru, sığınakları ve dönüş sınırını verir. Sonuç, gerekçeleriyle birlikte sade bir GO / CAUTION / NO-GO kararıdır.

Her şey tarayıcıda çalışır. Sunucu, hesap ve dil modeli yoktur: planlayıcı deterministiktir, aynı girdi her zaman aynı rotayı verir.

## Hızlı başlangıç

Yalnızca [Node.js](https://nodejs.org) 20.19 ya da daha yenisi gerekir.

```bash
git clone https://github.com/farukhv/nasa.git
cd nasa
npm run dev
```

İlk çalıştırma bağımlılıkları kendisi kurar (yaklaşık bir dakika), ardından yerel adresi yazar; bu çoğunlukla <http://localhost:5173> olur. Sonraki çalıştırmalar hemen başlar. Sahne verileri depoyla birlikte gelir, bu yüzden bağımlılıklar kurulduktan sonra uygulama çevrimdışı da çalışır.

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Eksikleri kurar ve uygulamayı canlı yenilemeyle başlatır |
| `npm run build` | Tip denetimi yapar ve statik siteyi `app/dist` klasörüne derler |
| `npm run preview` | Derlenmiş siteyi yerelde sunar |
| `npm run lint` | Kod denetimini çalıştırır |

## Kullanım

İlk açılışta bir tanıtım turu başlar; **Tur** düğmesiyle yeniden açılabilir. Sağ üstteki denetimler her zaman görünür:

- **TR / EN** arayüz dilini değiştirir. Seçim hatırlanır; ilk açılışta tarayıcının dili belirleyicidir.
- **☀ / ☾** koyu ve açık tema arasında geçiş yapar.
- **Kask HUD** rotayı astronotun gözünden gösterir.

Haritada yeşil düz çizgi ana rota, camgöbeği kesikli çizgi B planı, pembe taralı alanlar yasak bölgedir. Bir çizginin ya da işaretin üzerine gelince ne olduğu yazar. Tekerlekle yakınlaşılır, sürükleyerek kaydırılır, çift tıklamayla harita ekrana sığdırılır.

| Tuş | İşlev | Tuş | İşlev |
|---|---|---|---|
| `1` | Nominal plana dön | `B` | A ve B rotası arasında geç |
| `2` | Güneş parçacık fırtınası | `L` | Harita katmanını değiştir |
| `3` | Giysi oksijen sızıntısı | `H` | Kask HUD |
| `4` | Yaralı ekip arkadaşı | `F` | Haritayı pencereye sığdır |
| `5` | Yürüyüşün %45'inden yeniden planla | `P` | Kol kontrol listesini yazdır |
| `6` | Sahne değiştir | `Esc` | HUD'dan ya da turdan çık |

## Neler yapar

- **İki gerçek sahne.** Jezero · Three Forks (HiRISE 25 cm ortho görüntü, 1 m arazi modeli, CRISM mineralojisi, Perseverance yol noktaları ve Navcam kareleri) ve Elysium · InSight (arazi modeli olmayan tek bir HiRISE görüntüsü; sistemin az veriyle nasıl davrandığını gösterir).
- **Hücre başına üç puan.** Güvenlik: kaya bolluğu, eğim, zemin direnci, radyasyon, dönüş oksijeni ve sıcaklık. Bilim: jeoloji, taze yüzeyler, çeşitlilik, yakınlık ve hidrasyon. Güven: görüntü kalitesi, veri kapsamı, algılayıcı uyumu, kararlılık ve konum doğruluğu.
- **Kesin yasak kuralları.** 25°'nin üzerindeki eğim, %40'ın üzerindeki kaya bolluğu ve tehlikeli zemin, bilimsel değeri ne olursa olsun duvardır.
- **Bütçe içinde hedef sıralama.** Ödüllü yönbulma çözücüsü oksijen ve süre bütçesine sığan hedefleri seçip sıralar, atlanan hedefin nedenini yazar.
- **Rota A ve B planı.** Tam çözünürlükte A*; B planı, A rotasının en zayıf halkası kapatılarak bulunur.
- **Dönüş sınırı.** Her noktada kalan oksijen, dönüş için gereken oksijenin 1,2 katını karşılamalıdır; ilk ihlal dönüşü olmayan noktadır.
- **Sığınaklar ve koridor.** Her noktadan habitata ya da rovera süre, yol üstündeki korunaklı bekleme noktaları ve konum belirsizliğiyle genişleyen bir koridor.
- **Yürüyüş sırasında yeniden planlama.** Güneş parçacık fırtınası, giysi sızıntısı, yaralı ekip arkadaşı, kullanılamayan rover, konum kaybı ve toz fırtınası astronotun bulunduğu noktadan yeniden planlanır.
- **EVA saat penceresi.** Güneş geometrisi, sıcaklık ve toz şeytanı tepe saatlerinden günün her yarım saati için bir puan.
- **Verisi konusunda dürüst.** Her girdi gözlenen, türetilmiş, modellenmiş ya da varsayım olarak etiketlidir; güven düşükse karar CAUTION'a iner.

## Nasıl çalışır

```
yörünge görüntüsü + arazi modeli + mineral haritası
        │  pipeline/build_scene.py  (Python, çevrimdışı, isteğe bağlı)
        ▼
hücre bazlı özellik kanalları  →  data/public/scenes/<sahne>/
        │  Web Worker içinde yüklenir
        ▼
fields.ts   güvenlik S, bilim V, güven C, yasak maskesi, gölge, görüş hattı
search.ts   Dijkstra (dönüş oksijeni alanı), A* (bacaklar), mesafe dönüşümü
route.ts    hedef sıralama, rota A, B planı, koridor, sığınaklar, dönüş sınırı, puanlama
        ▼
React arayüzü: harita (Canvas), paneller, rota profili, kask HUD
```

Bir adımın yol maliyeti `w_d·ΔO₂ + w_s·(100 − S) + w_v·(100 − V)` biçimindedir; güvenlik ve bilim varsayılan olarak 70 : 30 ağırlıklıdır. Yasak hücreler, maliyet hesaplanmadan önce dışarıda bırakılır. Oksijen tüketimi Apollo metabolik hızlarından türetilen bir dönüş modeline dayanır; eğime, zemin türüne, taşınan numuneye ve yorgunluğa göre ölçeklenir. Tüm ağırlıklar, katsayılar ve eşikler kaynaklarıyla birlikte tek bir dosyada, `app/src/engine/config.ts` içinde durur; başlıcaları arayüzden değiştirilebilir.

## Proje yapısı

| Yol | İçerik |
|---|---|
| `app/src/engine/config.ts` | Tüm ağırlıklar, katsayılar ve eşikler, kaynaklarıyla |
| `app/src/engine/fields.ts` | Hücre puanları, yasak maskesi, gölge, görüş alanı, radyasyon, sıcaklık |
| `app/src/engine/search.ts` | Dijkstra, A*, mesafe dönüşümü |
| `app/src/engine/route.ts` | Hedef sıralama, A ve B rotaları, koridor, sığınaklar, dönüş sınırı, puanlama |
| `app/src/engine/physio.ts` | Oksijen, soğutma suyu, yürüme hızı, yorgunluk, güneş ve toz modelleri |
| `app/src/engine/messages.ts` | Planlayıcının iki dildeki açıklama ve uyarıları |
| `app/src/workers/planner.worker.ts` | Planlayıcıyı ana iş parçacığının dışında çalıştırır |
| `app/src/i18n/` | Arayüz sözlükleri (`tr.ts`, `en.ts`) ve dil bağlamı |
| `app/src/ui/` | Harita, paneller, rota profili, kask HUD, tanıtım turu, yazdırma sayfası |
| `app/src/scenes.ts` | Sahne tanımları ve bilimsel hedefler |
| `data/public/` | Uygulamanın sunduğu hazır sahne kanalları, taban görüntüleri ve rover görüntüleri |
| `pipeline/` | Sahne kanallarını üreten Python ön işleme betikleri |
| `scripts/ensure-deps.mjs` | Uygulama bağımlılıklarını gerektiğinde kurar |

### Yeni dil eklemek

`app/src/i18n/en.ts` dosyasını kopyalayın, değerleri çevirin ve yeni sözlüğü `app/src/i18n/index.ts` içinde kaydedin. Sözlükler `tr.ts` dosyasına göre tiplidir; eksik bir anahtar derlemeyi durdurur. Karşılık gelen girdileri `app/src/engine/messages.ts` dosyasına ve `config.ts` ile `scenes.ts` içindeki iki dilli alanlara da ekleyin.

## Sahne verisini yeniden üretmek (isteğe bağlı)

Uygulamanın bu adıma ihtiyacı yoktur. Yalnızca sahneleri özgün kaynaklardan yeniden üretmek içindir; Python 3.10+ ve internet bağlantısı gerekir.

```bash
pip install -r pipeline/requirements.txt
python pipeline/fetch_jezero.py          # Mars Trek HiRISE karoları ve USGS 1 m arazi modeli penceresi
python pipeline/build_scene.py jezero    # özellik kanalları → data/public/scenes/jezero
python pipeline/build_scene.py insight   # depo kökünde PIA26515.tif gerekir
```

`PIA26515.tif`, NASA'nın yayımladığı InSight iniş yeri HiRISE görüntüsüdür; NASA Photojournal'dan indirip depo köküne koyun. Ham indirmeler `data/raw/` klasörüne gider ve depoya eklenmez.

## Veri ve atıf

- HiRISE görüntüleri: NASA/JPL-Caltech/University of Arizona
- Arazi modeli: USGS Astrogeology Science Center (CC0)
- CRISM mineral haritası: Parente, Itoh ve Saranathan, Zenodo 5575824 (CC BY)
- Perseverance yol noktaları, numune tüpü konumları ve Navcam, Mastcam-Z, WATSON görüntüleri: NASA/JPL-Caltech (ASU ve MSSS ile)
- Spirit Pancam panoraması: NASA/JPL/Cornell

Sıcaklık, güneş geometrisi ve radyasyon birer modeldir; Elysium sahnesinde ölçülmüş arazi modeli yoktur. Arayüz bunları modellenmiş ya da varsayım olarak işaretler. Bu çalışma bir fikri sınamak için hazırlanmış bir hackathon prototipidir, uçuş yazılımı değildir.
