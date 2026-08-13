/*
 * Süni siqnal generatoru.
 *
 * Məqsəd: pitch detection-u mikrofon, dinamik, otaq və alət olmadan
 * yoxlamaq. Burada yaradılan siqnalın tezliyini biz DƏQİQ bilirik,
 * ona görə alqoritmin nə qədər yanıldığını sentlə ölçə bilirik.
 */

export const SAMPLE_RATE = 48000;
export const BUFFER_SIZE = 2048;

/* İki tezlik arasındakı fərq — sentlə. Musiqidə səhvin universal ölçüsü. */
export function centsBetween(a, b) {
  if (!a || !b) return Infinity;
  return 1200 * Math.log2(a / b);
}

/*
 * Harmonik tərkibli ton yaradır.
 *
 * harmonics: hər üst tonun nisbi gücü. [1] = təmiz sinus.
 *            [1, 0.6, 0.4, 0.3, 0.2] = skripkaya bənzər zəngin ton.
 * noise:     ağ küy səviyyəsi (0 = küysüz).
 * vibratoCents / vibratoRate: vibrato dərinliyi və sürəti.
 * dcOffset:  bəzi mikrofonlarda olan sabit sürüşmə.
 */
export function makeTone({
  freq,
  sampleRate = SAMPLE_RATE,
  length = BUFFER_SIZE,
  harmonics = [1],
  amplitude = 0.3,
  noise = 0,
  vibratoCents = 0,
  vibratoRate = 5,
  dcOffset = 0,
  seed = 12345
}) {
  const buf = new Float32Array(length);

  /* Təkrarlana bilən küy — testlər hər dəfə eyni nəticəni verməlidir */
  let rngState = seed;
  const rand = () => {
    rngState = (rngState * 1664525 + 1013904223) % 4294967296;
    return (rngState / 4294967296) * 2 - 1;
  };

  /* Hər harmonika üçün ayrıca faza yığırıq — vibrato zamanı
     sadəcə sin(2πft) yazmaq yanlış nəticə verir. */
  const phases = new Array(harmonics.length).fill(0);
  const norm = harmonics.reduce((a, b) => a + Math.abs(b), 0) || 1;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;

    let f = freq;
    if (vibratoCents > 0) {
      const dev = (vibratoCents / 1200) * Math.sin(2 * Math.PI * vibratoRate * t);
      f = freq * Math.pow(2, dev);
    }

    let sample = 0;
    for (let h = 0; h < harmonics.length; h++) {
      phases[h] += (2 * Math.PI * f * (h + 1)) / sampleRate;
      sample += harmonics[h] * Math.sin(phases[h]);
    }

    buf[i] = (sample / norm) * amplitude + noise * rand() + dcOffset;
  }

  return buf;
}

export function makeSilence(length = BUFFER_SIZE) {
  return new Float32Array(length);
}

/* Yalnız küy — mikrofonun boş otaqda tutduğu fon */
export function makeNoise(level = 0.01, length = BUFFER_SIZE, seed = 999) {
  let rngState = seed;
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    rngState = (rngState * 1664525 + 1013904223) % 4294967296;
    buf[i] = ((rngState / 4294967296) * 2 - 1) * level;
  }
  return buf;
}

/* Hazır tembr profilləri */
export const TIMBRE = {
  /* İdeal hal — laboratoriya şəraiti */
  pure: [1],

  /* Skripkaya bənzər: güclü əsas ton + zəngin üst tonlar */
  violin: [1, 0.65, 0.45, 0.32, 0.24, 0.18, 0.12, 0.08],

  /* Telefon dinamiki: əsas ton demək olar ki, yoxdur.
     13 Avqust testində müşahidə etdiyimiz halın modeli. */
  phoneSpeaker: [0.05, 0.5, 1.0, 0.7, 0.4, 0.25],

  /* Ucuz mikrofon: əsas ton zəifləyib, amma tam itməyib */
  weakFundamental: [0.3, 1.0, 0.6, 0.4, 0.2]
};

/* Skripkanın birinci mövqe diapazonu — oyunun istifadə etdiyi notalar */
export const TEST_NOTES = [
  { name: 'G3', freq: 196.00 },
  { name: 'A3', freq: 220.00 },
  { name: 'B3', freq: 246.94 },
  { name: 'C4', freq: 261.63 },
  { name: 'D4', freq: 293.66 },
  { name: 'E4', freq: 329.63 },
  { name: 'F#4', freq: 369.99 },
  { name: 'G4', freq: 392.00 },
  { name: 'A4', freq: 440.00 },
  { name: 'B4', freq: 493.88 },
  { name: 'C5', freq: 523.25 },
  { name: 'D5', freq: 587.33 },
  { name: 'E5', freq: 659.25 }
];