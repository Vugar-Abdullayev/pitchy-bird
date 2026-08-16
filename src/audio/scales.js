/*
 * TONALLIQ (GAM) SİSTEMİ
 *
 * Əvvəl oyunda 13 nota sabit yazılmışdı və bu, Sol major gamı idi —
 * amma heç yerdə belə adlandırılmamışdı, sadəcə bir siyahı idi.
 *
 * Burada gam bir MƏLUMAT olur: kök nota + interval şablonu.
 * Bu sayədə yeni tonallıq əlavə etmək bir sətir yazmaq deməkdir,
 * və hər tonallıq real skripka məşqinə uyğun gəlir.
 *
 * Təsadüfi xromatik nota İSTİFADƏ EDİLMİR. Musiqi təsadüfi səs
 * ardıcıllığı deyil; şagird barmaq şablonu öyrənməlidir, şablon isə
 * yalnız tonallıq daxilində mövcuddur.
 */

/* Skripkanın açıq simləri — birinci mövqe diapazonunun sərhədləri */
export const MIDI_G3 = 55;   // 196.00 Hz — ən qalın sim
export const MIDI_E5 = 76;   // 659.25 Hz — ən nazik sim

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function midiToName(midi) {
  return PITCH_CLASS_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

/* İnterval şablonları — kökdən yarım ton fərqləri */
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR = [0, 2, 3, 5, 7, 8, 10];
const CHROMATIC = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/*
 * Skripkada rahatlıq sırasına görə düzülüb. Sol/Re/La major
 * açıq simlərdən istifadə etdiyi üçün yeni başlayana ən uyğunudur.
 */
export const SCALES = {
  /* BEMOLSUZ/DİYEZSİZ GAMLAR — yalnız natural notalar.
     Do major və La minor eyni 7 notadan ibarətdir (C D E F G A B),
     fərq yalnız hansının mərkəz sayılmasındadır. Hər ikisində
     F4 NATURALDIR — F#4 yoxdur. */
  cMajor: { id: 'cMajor', name: 'Do major', rootPc: 0, intervals: MAJOR, difficulty: 1 },
  aMinor: { id: 'aMinor', name: 'La minor', rootPc: 9, intervals: NATURAL_MINOR, difficulty: 2 },

  /* DİYEZLİ GAMLAR — hazırda səviyyələrdə istifadə olunmur.
     DİQQƏT: bunlar tərifinə görə diyez saxlayır. Sol major = F#,
     Re major = F# + C#, La major = F# + C# + G#. Diyezi çıxarsan
     həmin gam artıq o gam olmur. Lazım olanda səviyyəyə qoşulur. */
  gMajor: { id: 'gMajor', name: 'Sol major', rootPc: 7, intervals: MAJOR, difficulty: 2 },
  dMajor: { id: 'dMajor', name: 'Re major', rootPc: 2, intervals: MAJOR, difficulty: 3 },
  aMajor: { id: 'aMajor', name: 'La major', rootPc: 9, intervals: MAJOR, difficulty: 4 },
  chromatic: { id: 'chromatic', name: 'Xromatik', rootPc: 0, intervals: CHROMATIC, difficulty: 5 }
};

/*
 * Verilmiş diapazonda gama aid bütün notaları qaytarır.
 * Nəticə: [{ midi, freq, name }] — ən pesdən ən tizə doğru sıralı.
 */
export function buildScaleNotes(scale, minMidi = MIDI_G3, maxMidi = MIDI_E5) {
  const allowed = new Set(scale.intervals.map(i => ((scale.rootPc + i) % 12 + 12) % 12));
  const notes = [];

  for (let midi = Math.ceil(minMidi); midi <= Math.floor(maxMidi); midi++) {
    if (allowed.has(((midi % 12) + 12) % 12)) {
      notes.push({ midi, freq: midiToFreq(midi), name: midiToName(midi) });
    }
  }
  return notes;
}

/* İki nota arasındakı məsafə — yarım tonla */
export function semitonesBetween(a, b) {
  return Math.abs(a.midi - b.midi);
}

/* Tezliyə ən yaxın notanın adı. Səs yoxdursa null. */
export function freqToNoteName(freq) {
  if (!freq || freq <= 0) return null;
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  return midiToName(midi);
}