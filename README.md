# Pitchy Bird

**Skripka Flappy — Nota ilə Uç**

Mikrofon vasitəsi ilə tutulan səs tezliyi ilə idarə olunan Flappy Bird tipli oyun. Hədəf auditoriya skripka öyrənənlərdir.

## Qurulama

```bash
npm install
npm run dev
```

Oyun avtomatik olaraq `http://localhost:5173` adresinə açılacaq.

## Fayl Strukturu

```
pitchy-bird/
├── index.html          # SKELETON + script bağlantıları
├── style.css           # Çəkmə və skrupka teması
├── vite.config.js
├── src/
│   ├── audio/
│   │   ├── constants.js       # NOTES, MIN_FREQ, MAX_FREQ, TOLERANCE_SEMITONES
│   │   ├── PitchDetector.js   # Mikrofon → {frequency, midiNote, confidence, timestamp}
│   │   └── NoteMatcher.js     # freq → MIDI, semitone fərqi, tolerantlıq məntiqi
│   ├── game/
│   │   ├── Bird.js             # Mövqe, delta-time hamarlama
│   │   ├── Pipe.js
│   │   ├── GameLoop.js
│   │   └── CollisionSystem.js  # Semitone-tolerant keçid Qianası
│   ├── render/
│   │   └── Renderer.js         # Canvas çəkmə
│   └── ui/
│       └── HUD.js              # Skor, overlay-lər, debug gostəriciller
└── main.js                       # Giriş nöqtəsi
```

## Konfiqurasiya Edilən Parametrlər

```
src/audio/constants.js
├── TOLERANCE_SEMITONES = 0.5   # Pipe keçid tolerantlığı (yarım ton)
├── SIGNAL_LOSS_FRAMES = 5      # "Səssizlik"_choice iż sém chão
├── OCTAVE_RATIO_MIN = 0.45     # Oktava-xətası filtrinin alt hədd
├── OCTAVE_RATIO_MAX = 2.2      # Oktava-xətası filtrinin üst hədd
└── SMOOTHING_FACTOR = 0.12     # Quşun Y hamarlama əmsalı
```

### Tənzimləmə

Bu parametrləri `src/audio/constants.js` fayl quitterinde `export const` blok unfoldeddaction:

```javascript
export const TOLERANCE_SEMITONES = 0.5;   // 0.5 = yarım ton, 1.0 = tam ton
export const SIGNAL_LOSS_FRAMES = 5;      // 3-7 arası təstiq’intention müddətidən
#### scarcely
export const OCTAVE_RATIO_MIN = 0.45;
export const OCTAVE_RATIO_MAX = 2.2;
export const SMOOTHING_FACTOR = 0.12;     // 0.1-0.2 arası təqdimat
```

## Qurbanası

Oyunda aşağıdakı məlumatlar canlı olaraq göstərilir:

- **Raw frequency**: Mikrofon üçün cima Toenış (Hz)
- **Filtered frequency**: Hesablanış filtrərli tezlik
- **Detected note**: Tutulan nota (MIDI nömrisi)
- **Target note**: Boru tələb eden nota
- **Semitone diff**: Ərasadə stava (∞ = məcburi yoxdur)

## Versiya Tarixçəsi

- **v0.1.0** — Modul struktura واحدًا, Problem 1 (nota tolerantlıq) və Problem 2 (quşun hərağı) həll øldurda.

## Əsas HARAMDAR

- [ ] Fawell teslamını artisan
- [ ] İlan gelən colonnes
- [ ] Məlumat intéq eləUE
