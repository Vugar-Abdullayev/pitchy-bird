/*
 * PERDƏ ↔ EKRAN ÇEVİRMƏSİ
 *
 * Əvvəl bu iş audio/constants.js-də idi — yəni piksel hesabı səs
 * qatında yaşayırdı. İki problem yaradırdı:
 *   1. Oyun məntiqini piksel olmadan test etmək mümkün deyildi.
 *   2. Ekran ölçüsü sabit qəbul edilirdi (720×480).
 *
 * İndi bu obyekt ekran hündürlüyünü qəbul edir və bütün ölçüləri
 * ondan törədir. HƏLLEDİCİ QAYDA: oyunun bütün ölçüləri SENT ilə
 * təyin olunur, piksel yalnız son anda hesablanır.
 *
 * Bu sayədə ±50 sent tolerantlıq hər ekranda həqiqətən ±50 sentdir.
 * Kiçik ekranda görsel olaraq daralır, amma musiqi baxımından
 * eyni qalır — yəni oyun ekrana görə asanlaşmır və çətinləşmir.
 */

import { MIDI_G3, MIDI_E5, midiToFreq } from '../audio/scales.js';

/* Diapazonun hər iki ucunda pay saxlayırıq: şagird bemol/diyez
   çalanda ekrandan düşməsin, "səsin yoxdur" əvəzinə real yer görsün. */
const HIGH_MARGIN_SEMITONES = 1;

/*
 * Aşağıda daha çox pay saxlayırıq (3 yarım ton). İki səbəb:
 *
 *  1. Susan quşun düşəcəyi yer LAZIMDIR. Əvvəl bunu xəritədən kənar
 *     "zəmin bandı" kimi ayırmışdım — ekranın 13%-i boş qalırdı.
 *     Payı xəritənin İÇİNƏ salmaq daha səmərəlidir: eyni məqsəd,
 *     boş sahə yox.
 *  2. Bemol çalan şagird ekrandan düşmür, "çox aşağıdasan" görür.
 *
 * Bunun bədəli: notalar ~10% sıx düzülür. Tolerantlıq sentlə təyin
 * olunduğu üçün ölçünün DOĞRULUĞU dəyişmir, yalnız piksel eni azalır.
 */
const LOW_MARGIN_SEMITONES = 3;

/*
 * Ekran çox alçaqdırsa tam diapazon sığmır. Belə halda diapazonu
 * daraldırıq — amma bu QLOBAL qərar deyil, yalnız həmin cihaza aid
 * çarədir. Masaüstündə iki oktav, dar telefonda bir oktav.
 */
const RANGE_PRESETS = [
  { id: 'full', lowMidi: MIDI_G3, highMidi: MIDI_E5 },                 // G3–E5, ~2 oktav
  { id: 'wide', lowMidi: MIDI_G3, highMidi: MIDI_G3 + 17 },            // G3–C5
  { id: 'octave', lowMidi: MIDI_G3, highMidi: MIDI_G3 + 12 }           // G3–G4
];

/*
 * Tolerantlıq bundan az piksel tutursa diapazonu daraldırıq.
 *
 * Əvvəl 11 yazmışdım — səhv idi. Yüksək səviyyələrdə tolerantlıq
 * TƏBİİ olaraq kiçikdir (məqsəd budur). 11 piksel tələb etmək usta
 * səviyyəsində diapazonu bir oktava endirirdi — yəni irəli şagird
 * DAHA DAR sahədə oynayırdı. Tam tərsi olmalıdır.
 *
 * Daraltma yalnız son çarə olmalıdır: 6 piksel + quş gövdəsi
 * ən azı ~24 piksellik görünən boşluq deməkdir.
 */
const MIN_TOLERANCE_PX = 6;

export function centsBetween(freqA, freqB) {
  return 1200 * Math.log2(freqA / freqB);
}

export function shiftByCents(freq, cents) {
  return freq * Math.pow(2, cents / 1200);
}

/*
 * playHeight: oyun sahəsinin piksel hündürlüyü
 * toleranceCents: cari səviyyənin tolerantlığı (bir tərəfə)
 */
export function chooseRange(playHeight, toleranceCents) {
  for (const preset of RANGE_PRESETS) {
    const lowFreq = midiToFreq(preset.lowMidi - LOW_MARGIN_SEMITONES);
    const highFreq = midiToFreq(preset.highMidi + HIGH_MARGIN_SEMITONES);
    const totalCents = centsBetween(highFreq, lowFreq);
    const pxPerCent = playHeight / totalCents;

    if (toleranceCents * pxPerCent >= MIN_TOLERANCE_PX) {
      return { ...preset, lowFreq, highFreq, totalCents, pxPerCent };
    }
  }

  /* Heç biri sığmırsa ən dar variantı veririk — oyun yenə də
     düzgün işləyir, sadəcə görsel olaraq sıxdır. */
  const last = RANGE_PRESETS[RANGE_PRESETS.length - 1];
  const lowFreq = midiToFreq(last.lowMidi - LOW_MARGIN_SEMITONES);
  const highFreq = midiToFreq(last.highMidi + HIGH_MARGIN_SEMITONES);
  const totalCents = centsBetween(highFreq, lowFreq);
  return { ...last, lowFreq, highFreq, totalCents, pxPerCent: playHeight / totalCents, cramped: true };
}

/*
 * ZƏMİN
 *
 * Səhv: ekranın dibi ilə ən pes nota (G3) eyni yerə düşürdü.
 * Şagird susanda quş dibə yapışır, dib isə elə G3 hündürlüyüdür —
 * yəni heç nə çalmadan G3 borularından keçmək olurdu.
 *
 * Həll: ən pes notanın ALTINDA oyunulmayan bir zolaq. Quş ora düşə
 * bilər, amma zəminə dəymək = oyun bitir. Flappy Bird məntiqi.
 */
export const FLOOR_RATIO = 0.09;
export const FLOOR_MIN_PX = 26;

export function floorHeightPx(availableHeight) {
  return Math.max(FLOOR_MIN_PX, availableHeight * FLOOR_RATIO);
}

export function createPitchMapping({ playTop, playBottom, floorY, toleranceCents }) {
  const playHeight = playBottom - playTop;
  const range = chooseRange(playHeight, toleranceCents);
  const { lowFreq, highFreq, totalCents, pxPerCent } = range;

  return {
    range,
    playTop,
    playBottom,
    floorY: floorY !== undefined ? floorY : playBottom,
    playHeight,
    pxPerCent,
    lowFreq,
    highFreq,

    /* Tezlik → ekran hündürlüyü. Loqarifmik: ekranın hər yerində
       1 sent fərq eyni piksel fərqidir. */
    freqToY(freq) {
      if (!freq || freq <= 0) return playBottom;
      const clamped = Math.min(highFreq, Math.max(lowFreq, freq));
      const ratio = centsBetween(clamped, lowFreq) / totalCents;
      return playBottom - ratio * playHeight;
    },

    yToFreq(y) {
      const clampedY = Math.min(playBottom, Math.max(playTop, y));
      const ratio = (playBottom - clampedY) / playHeight;
      return shiftByCents(lowFreq, ratio * totalCents);
    },

    centsToPx(cents) {
      return cents * pxPerCent;
    },

    pxToCents(px) {
      return px / pxPerCent;
    },

    /* Nota bu diapazonda görünürmü? Dar ekranda bəzi notalar düşür. */
    isVisible(freq) {
      return freq >= lowFreq && freq <= highFreq;
    }
  };
}