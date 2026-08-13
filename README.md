# Pitchy Bird

**Skripka Flappy — Nota ilə Uç**

Mikrofondan tutulan səs tezliyi ilə idarə olunan Flappy Bird tipli oyun.
Hədəf auditoriya: skripka öyrənənlər.

Status: **erkən mərhələ.** Oyun oynanır, lakin pitch detection hələ ölçülməyib
və istehsalat səviyyəsində deyil. Bax: "Bilinən məhdudiyyətlər".

## Qurulum

```bash
npm install
npm run dev
```

Oyun `http://localhost:5173` ünvanında açılır. Mikrofon icazəsi tələb olunur.

```bash
npm run build     # dist/ qovluğuna build
npm run preview   # build-i lokal yoxla
```

## Necə işləyir

```
Mikrofon
  → PitchDetector      tezlik + confidence çıxarır
  → Bird               tezliyi ekran hündürlüyünə çevirir
  → CollisionSystem    həndəsi toqquşma + nota geri bildirişi
  → Renderer           canvas
```

Quşun hündürlüyü **loqarifmik** olaraq tezliyə bağlıdır: ekranın hər yerində
1 sent fərq eyni piksel fərqinə uyğun gəlir. Bu, entonasiya səhvinin ekranın
hər nöqtəsində eyni cür görünməsi üçün vacibdir.

Diapazon: **G3 (196 Hz) — E5 (659 Hz)** — skripkanın birinci mövqe zonası,
ən qalın simdən ən nazik simə qədər.

## Fayl strukturu

```
pitchy-bird/
├── index.html
├── style.css
├── vite.config.js
└── src/
    ├── main.js                 # giriş nöqtəsi, oyun döngüsü
    ├── audio/
    │   ├── constants.js        # NOTES cədvəli, tezlik↔MIDI↔Y çevirmələri
    │   ├── PitchDetector.js    # mikrofon → { frequency, midiNote, confidence, hasSignal }
    │   └── NoteMatcher.js      # semiton fərqi hesablamaları
    ├── game/
    │   ├── Bird.js             # mövqe, hamarlama, cazibə
    │   ├── Pipe.js             # boru spawn və hərəkəti
    │   ├── CollisionSystem.js  # toqquşma + nota geri bildirişi
    │   └── GameLoop.js         # HAZIRDA İSTİFADƏ OLUNMUR (main.js öz döngüsünü işlədir)
    ├── render/Renderer.js
    └── ui/HUD.js
```

## Oyun qaydası

- Notanı çal (və ya oxu) — quş həmin notanın hündürlüyünə qalxır
- Sussan quş düşür
- **Yalnız boruya dəymək öldürür.** Səhv nota öldürmür — boşluq onsuz da
  düzgün notanın hündürlüyündə açılır

## Bilinən məhdudiyyətlər

Bunlar məlumdur və roadmap-də planlaşdırılıb — yeni issue açmağa ehtiyac yoxdur:

- **Pitch detection ölçülməyib.** Real skripkada dəqiqliyi bilinmir. Test
  infrastrukturu M1-də qurulur.
- **Audio emalı əsas thread-də işləyir** və `requestAnimationFrame`-ə bağlıdır.
  Mobil cihazlarda kəkələmə ehtimalı var (M2).
- **Boru sürəti kadr tezliyindən asılıdır.** 120 Hz ekranda oyun iki dəfə
  sürətli işləyir (M4).
- **Boşluq həddindən artıq genişdir** (~±300 sent). Entonasiya faktiki olaraq
  yoxlanmır (M5).
- **`constants.js`-dəki bəzi parametrlər hələ qoşulmayıb:** `SIGNAL_LOSS_FRAMES`,
  `SMOOTHING_FACTOR`, `OCTAVE_RATIO_MIN/MAX` export olunur, lakin heç yerdən
  import edilmir. Onları dəyişmək hazırda heç bir təsir yaratmır (M2).
  Faktiki olaraq işləyən yeganə parametr: `TOLERANCE_SEMITONES`.
- **Mobil dəstəklənmir.** Canvas sabit 720×480-dir (M6).
- **Test yoxdur** (M1).

## Brauzer tələbləri

`getUserMedia` və `AudioContext` dəstəyi lazımdır, həmçinin **secure context**
(`https://` və ya `localhost`). Adi `http://` üzərindən mikrofon açılmır.