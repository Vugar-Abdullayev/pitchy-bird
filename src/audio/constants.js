/* NOTES configuration - G3 (196Hz) to E5 (659Hz) */
export const NOTES = [
  {name:'G3', freq:196.00},
  {name:'A3', freq:220.00},
  {name:'B3', freq:246.94},
  {name:'C4', freq:261.63},
  {name:'D4', freq:293.66},
  {name:'E4', freq:329.63},
  {name:'F#4', freq:369.99},
  {name:'G4', freq:392.00},
  {name:'A4', freq:440.00},
  {name:'B4', freq:493.88},
  {name:'C5', freq:523.25},
  {name:'D5', freq:587.33},
  {name:'E5', freq:659.25}
];

/* Frequency bounds for pitch mapping */
export const MIN_FREQ = NOTES[0].freq * 0.94;
export const MAX_FREQ = NOTES[NOTES.length - 1].freq * 1.06;

/* Configuration parameters - EXPORTED for easy tuning */
export const TOLERANCE_SEMITONES = 0.5;
  // 0.5 = ~half semitone tolerance
  // ~0.33 = ~1/3 semitone (very strict)
  // ~1.0 = ~1 full semitone (very loose)
export const SIGNAL_LOSS_FRAMES = 5;
export const OCTAVE_RATIO_MIN = 0.45;
export const OCTAVE_RATIO_MAX = 2.2;
export const SMOOTHING_FACTOR = 0.12;

/* Helper: frequency to MIDI note number */
export function freqToMidi(freq) {
  if (!freq || freq <= 0) return null;
  return 69 + 12 * Math.log2(freq / 440);
}

/* Helper: MIDI note to frequency */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/* Helper: frequency to Y coordinate on canvas */
export function freqToY(freq, playTop, playBottom) {
  const f = Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq));
  const t = (Math.log2(f) - Math.log2(MIN_FREQ)) / (Math.log2(MAX_FREQ) - Math.log2(MIN_FREQ));
  return playBottom - t * (playBottom - playTop);
}

/* Helper: note name from MIDI number */
export function midiToNoteName(midi) {
  if (midi === null || midi === undefined) return '—';
  const rounded = Math.round(midi);
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const name = names[(rounded % 12 + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return name + octave;
}