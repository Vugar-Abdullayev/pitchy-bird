# Pitchy Bird

**Skripka Flappy — Nota ilə Uç**

Mikrofondan tutulan səsin tezliyi ilə idarə olunan Flappy Bird tipli oyun.
Quşun ekrandakı hündürlüyü çaldığın notanın perdəsidir: düzgün notanı
düzgün kökləyə bilsən boşluqdan keçirsən, entonasiyan sürüşsə boruya dəyirsən.

**Hədəf auditoriya:** skripka öyrənənlər.
**Status:** işlək prototip. Səs tanıma süni siqnallarla ölçülüb və yaxşı nəticə
verir, lakin real skripka ilə hələ sınaqdan keçirilməyib.

---

## Qurulum

```bash
npm install
npm run dev
```

Oyun `http://localhost:5173` ünvanında açılır. Mikrofon icazəsi tələb olunur.

```bash
npm run build     # dist/ qovluğuna yığır
npm run preview   # yığılmış versiyanı lokal yoxlayır
npm test          # bütün testlər (brauzer lazım deyil)
```

**Brauzer tələbləri:** `getUserMedia` və `AudioContext` dəstəyi, həmçinin
**təhlükəsiz kontekst** (`https://` və ya `localhost`). Adi `http://`
üzərindən brauzer mikrofonu açmır.

---

## Sistem necə işləyir

```
Mikrofon
   ↓  getUserMedia (echoCancellation / noiseSuppression / AGC — SÖNDÜRÜLÜB)
PitchDetector          MPM alqoritmi → { frequency, confidence, hasSignal }
   ↓
pitchMapping           tezlik → ekran hündürlüyü (loqarifmik)
   ↓
Bird                   hamarlama + cazibə
   ↓
CollisionSystem        həndəsi toqquşma
   ↓
Renderer               canvas
```

Səs emalı brauzerin avtomatik "yaxşılaşdırmalarını" qəsdən söndürür.
Bu funksiyalar nitq üçün nəzərdə tutulub və musiqi siqnalını təhrif edərək
perdə tanımanı etibarsız edir.

---

## Əsas prinsip: hər şey SENT ilə ölçülür

Bu layihənin ən mühüm qərarı budur.

Oyunun bütün ölçüləri musiqi vahidində (sent) təyin olunur, piksel ilə yox.
Piksellər yalnız son anda, ekran ölçüsünə görə hesablanır.

**Sent nədir:** bir oktav 1200 sentdir, bir yarım ton 100 sent.
Entonasiya səhvinin universal ölçüsü.

**Nə üçün belədir:** piksel ekrandan ekrana dəyişir, sent dəyişmir.
Tolerantlığı piksel ilə yazsaydıq, oyun böyük monitorda asanlaşar, telefonda
çətinləşərdi — bu isə ölçmə aləti üçün yolverilməzdir.

Nəticə: **±50 sent tolerantlıq hər cihazda həqiqətən ±50 sentdir.**
Kiçik ekranda boşluq piksel olaraq daralır, musiqi baxımından eyni qalır.

### Perdə → hündürlük çevirməsi loqarifmikdir

Qulaq perdəni **nisbət** kimi qavrayır, fərq kimi yox:

| | Tezlik | Fərq | Musiqi məsafəsi |
|---|---|---|---|
| G3 → G4 | 196 → 392 Hz | +196 Hz | 1 oktav |
| G4 → G5 | 392 → 784 Hz | +392 Hz | 1 oktav |

Eyni musiqi məsafəsi, iki dəfə fərqli Hz. Loqarifm çarpmanı toplamaya çevirir,
buna görə `freqToY` loqarifmikdir: **ekranın hər yerində 1 sent fərq eyni
piksel fərqidir.** Şagirdin eyni səhvi ekranın hər nöqtəsində eyni cür görünür.

---

## Səs tanıma (PitchDetector)

Alqoritm: **McLeod Pitch Method (MPM)**.

Üç mərhələ:

1. **NSDF** — normallaşdırılmış fərq funksiyası. Nəticə `[-1, 1]` aralığındadır
   və uzaq lag-larda sönmür, buna görə müqayisə ədalətlidir.
2. **Açar təpələr** — yalnız sıfır keçidləri arasındakı ən yüksək nöqtələr.
   Küyün yaratdığı xırda dalğalanmalar avtomatik kənarda qalır.
3. **Təpə seçimi** — ən güclü təpənin **90%-ni keçən İLK** təpə seçilir.
   Üst tonlar həmişə əsas tondan sonra gəldiyi üçün əsas ton qalib gəlir.

Üçüncü addım həlledicidir: köhnə "ilk təpəni götür" məntiqi telefon dinamiki
kimi əsas tonu zəif olan mənbələrdə həmişə üst tonu tuturdu.

### Ayar parametrləri

`src/audio/PitchDetector.js` konstruktorunda:

| Parametr | Dəyər | Nə edir |
|---|---|---|
| `absMinFreq` / `absMaxFreq` | 80 / 1200 Hz | Alqoritmin fiziki iş diapazonu |
| `minFrequency` / `maxFrequency` | `MIN_FREQ` / `MAX_FREQ` | Oyunun qəbul etdiyi diapazon |
| `nsdfThreshold` | 0.5 | Siqnalın periodik sayılması üçün minimum güc |
| `peakPickRatio` | 0.9 | Təpə seçimi həddi |
| `minRMSThreshold` | 0.005 | Sükut həddi |
| `smoothingFactor` | 0.4 | Kiçik dəyişikliklərin hamarlanması |
| `jumpRatioMax` | 1.26 | Bundan böyük dəyişiklik təsdiq tələb edir (≈4 yarım ton) |
| `jumpConfirmFrames` | 2 | Sıçrayış neçə kadr təsdiqlənməlidir (~33 ms) |
| `signalLossFrames` | 3 | Neçə sükut kadrından sonra "səs kəsildi" |

**Sıçrayış məntiqi haqqında:** böyük perdə dəyişikliyi RƏDD EDİLMİR, TƏSDİQ
EDİLİR. Əvvəlki versiyada "2.2 dəfədən böyük dəyişiklik səhvdir" qaydası vardı;
bu, G3→E5 kimi real musiqi sıçrayışını əbədi bloklayır və sistemi kilidləyirdi.

---

## Çətinlik sistemi

Bütün parametrlər `src/game/difficulty.js` faylında.

| Səviyyə | Tolerantlıq | Tutma müddəti | Maks. sıçrayış | Sürət | Keçid |
|---|---|---|---|---|---|
| 1 — Başlanğıc | ±50 sent | 700 ms | 4 yarım ton | 130 px/s | 8 boru |
| 2 — İkinci addım | ±40 sent | 900 ms | 7 yarım ton | 145 px/s | 10 boru |
| 3 — Orta | ±30 sent | 1100 ms | 12 yarım ton | 160 px/s | 12 boru |
| 4 — İrəli | ±25 sent | 1300 ms | 16 yarım ton | 175 px/s | 15 boru |
| 5 — Usta | ±20 sent | 1500 ms | 21 yarım ton | 190 px/s | — |

### Nə üçün ±50 sentdən başlayır

İki müstəqil səbəb eyni rəqəmə gətirir:

- **Musiqi:** 50 sent yarım tonun yarısıdır. Bu sərhəddin içindəsənsə çaldığın
  nota mübahisəsiz həmin notadır; kənarındasansa başqa notaya daha yaxınsan.
- **Ölçmə:** testlərdə küylü şəraitdə 10–20 sent sapma ölçülüb. Qayda budur ki,
  ölçmə xətası tolerantlıqdan 3–5 dəfə kiçik olmalıdır. Əks halda şagird öz
  səhvinə görə yox, bizim ölçmə xətamıza görə cəzalanır.

### Nə üçün ±20 sentdə dayanır

Ölçmə dəqiqliyimizin sərhəddi. Daha aşağı düşmək hazırda dürüst deyil.

### Çətinlik oxları

**Təhsil oxları** — çətinlik artanda şagird nəsə öyrənir:
tolerantlıq · **boru eni (notanı nə qədər TƏMİZ TUTMAQ lazımdır)** ·
sıçrayış böyüklüyü · tonallıq

**Arcade oxları** — çətinlik artır, amma skripka öyrənilmir:
sürət · borular arası məsafə · cazibə

Prinsip: çətinlik əsasən təhsil oxlarında artır. Oyunu sürətləndirmək skripka
öyrətmir; tolerantlığı daraltmaq və notanı daha uzun tutmağı tələb etmək öyrədir.

---

## Oyun qaydaları

- Notanı çal (və ya oxu) — nota işarəsi həmin perdənin hündürlüyünə qalxır
- **Yalnız boruya dəymək öldürür.** Səhv nota ayrıca cəzalandırılmır: boşluq
  onsuz da düzgün notanın hündürlüyündə açılır, deməli boşluqdan keçmək ELƏ
  entonasiya imtahanıdır
- Sussan işarə düşür. Zəmin öldürmür — amma ən pes notanın altına düşdüyün üçün
  növbəti borunun gövdəsinə dəyirsən
- Boşluğun içindəki solğun qırmızı zolaq **həqiqi tolerantlıqdır** — nişan
  alacağın yer odur. Boşluq bundan genişdir, çünki işarənin gövdəsi də sığmalıdır

### Oyunçu fiquru (nota qlifi)

Səkkizlik nota (♪). Toqquşma **tam qlifi** əhatə edir: baş, quyruq və bayraq.
Ölçülər `difficulty.js`-dəki `GLYPH` sabitindən gəlir və həm çəkim, həm toqquşma
eyni mənbədən oxuyur — yəni görünən forma ilə dəyən forma ayrıla bilməz.

Qlif şaquli olaraq simmetrik deyil (quyruq yuxarı çıxır), buna görə boru boşluğu
da simmetrik deyil. Bu zəruridir: boşluğu simmetrik saxlasaq, aşağıya doğru
tolerantlıq süni olaraq genişlənərdi və ölçü əyri olardı.

---

## Melodiya

Notalar `Math.random()` ilə yox, **məşq şablonlarından** gəlir:
qalxan/enən qamma, arpeggio, qonşu notalar, təkrar, sərbəst gəzinti.
Hər səviyyənin sıçrayış həddi var, buna görə yeni başlayana çalınmaz
iki oktavlıq sıçrayış düşmür.

Gələcək "klassik əsərlər" modu eyni interfeysdən qidalanacaq: `MelodySource`
sinfinin `next()` metodunu saxlayıb mənbəyi dəyişmək kifayətdir.

---

## Fayl strukturu

```
pitchy-bird/
├── index.html
├── style.css
├── vite.config.js
├── src/
│   ├── main.js                 giriş nöqtəsi, oyun döngüsü, ölçü hesabı
│   ├── audio/
│   │   ├── PitchDetector.js    mikrofon → perdə (MPM)
│   │   ├── scales.js           tonallıqlar, MIDI ↔ tezlik ↔ ad
│   │   └── constants.js        köhnə sabitlər (qismən əvəzlənib)
│   ├── game/
│   │   ├── difficulty.js       BÜTÜN çətinlik parametrləri + qlif həndəsəsi
│   │   ├── pitchMapping.js     tezlik ↔ ekran, sent ↔ piksel
│   │   ├── Bird.js             mövqe, hamarlama, cazibə
│   │   ├── Pipe.js             boru spawn və hərəkəti
│   │   ├── MelodySource.js     məşq şablonları
│   │   └── CollisionSystem.js  toqquşma (yalnız həndəsə)
│   ├── render/Renderer.js      canvas çəkimi
│   └── ui/HUD.js               xal, perdə paneli, overlay-lər
└── test/
    ├── signal.js               süni siqnal generatoru
    ├── report.mjs              alqoritm karnesi
    ├── stress.mjs              çətin şəraitlərdə davamlılıq
    └── pipeline.mjs            tam zəncir testi
```

---

## Testlər

Brauzer, mikrofon və skripka olmadan işləyir. Kompüter özü bilinən tezlikdə
süni səslər yaradır və alqoritmin nə qədər yanıldığını **sentlə** ölçür.

```bash
npm run test:report     # alqoritm karnesi — 6 senari × 13 nota
npm run test:stress     # 12 çətin şərait × 6 küy toxumu = 936 ölçmə
npm run test:pipeline   # tam zəncir: səs → süzgəc → oyun (25 yoxlama)
npm test                # hamısı
```

### Cari nəticələr

| Senari | Nəticə |
|---|---|
| Təmiz sinus | 100% — sapma < 4 sent |
| Skripkaya bənzər ton | 100% — sapma < 1 sent |
| Skripka + fon küyü | 100% |
| Telefon dinamiki (əsas ton zəif) | 100% |
| Vibrato | 100% — anlıq tezliyi düzgün izləyir |
| Zəif səs | 100% |
| Sükut / küy (yalançı pozitiv) | Yalançı tapıntı yoxdur |
| Oktav səhvi (936 ölçmədə) | **0** |

Sürət: bir ölçmə ~2.4 ms (server prosessorunda). Real cihazda ölçülməyib.

---

## Bilinən məhdudiyyətlər

Bunlar məlumdur və qeydə alınıb — yeni issue açmağa ehtiyac yoxdur.

**Səs**
- Real skripka ilə heç vaxt sınaqdan keçirilməyib. Bütün nəticələr süni siqnallardır.
- Audio emalı əsas thread-də işləyir və `requestAnimationFrame`-ə bağlıdır.
  Perdə ekran yeniləmə sürətində örnəklənir — 30 fps-lik telefonda saniyədə
  30 oxunuş. AudioWorklet-ə köçürmə planlaşdırılıb.
- `PitchDetector` konstruktorunda `minConfidence` iki dəfə təyin olunub (təmizlənməlidir).

**Oyun**
- **Tonallıq irəliləyişi hazırda təsirsizdir:** `cMajor` və `aMinor` bu
  diapazonda EYNİ notaları verir (hamısı bemol/diyezsiz). Yəni səviyyə 3→4→5
  keçidində gam adı dəyişir, oynanış dəyişmir. `dMajor` / `aMajor` / `chromatic`
  təyin olunub, lakin heç bir səviyyəyə bağlanmayıb.
- Səviyyələrin gam sırası qarışıqdır (3 = La minor, 4 = Do major, 5 = La minor).
- Oyun bitəndən sonra həmişə səviyyə 1-dən başlayır; irəliləyiş yadda saxlanmır.

**Mobil**
- Canvas duyarlıdır, lakin real telefonda sınanmayıb.
- Toxunma ilə idarəetmə yoxdur (ehtiyac da yoxdur — idarəetmə səslədir).

**Kod**
- `src/game/GameLoop.js` və `src/audio/NoteMatcher.js` istifadə olunmur (ölü kod).
- `src/audio/constants.js` qismən `scales.js` ilə əvəzlənib, hər ikisi qalıb.
- Avtomatik CI, lint və format konfiqurasiyası yoxdur.

---

## Texnologiya seçimləri

| Seçim | Səbəb |
|---|---|
| Vanilla JS + Canvas 2D | Oyun motoru bu ölçüdə layihə üçün artıq yükdür |
| Vite | Sürətli dev server, sadə build |
| Sıfır runtime asılılığı | Yeganə asılılıq `vite` (dev). Lock-in yoxdur |
| Öz MPM implementasiyası | Hazır kitabxana əvəzinə — tam nəzarət, ölçülə bilən |
| Test üçün sadə Node | Vitest/Jest əlavə etmədən kifayət edir |

---

## Lisenziya

Təyin olunmayıb.