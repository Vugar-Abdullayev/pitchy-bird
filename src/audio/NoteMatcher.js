import { NOTES, TOLERANCE_SEMITONES, freqToMidi, midiToFreq } from './constants.js';

export class NoteMatcher {
  constructor(notes, tolerance = TOLERANCE_SEMITONES) {
    this.notes = notes || NOTES;
    this.tolerance = tolerance;
  }

  /* Convert frequency to nearest MIDI note number */
  freqToMidi(freq) {
    if (!freq || freq <= 0) return null;
    return 69 + 12 * Math.log2(freq / 440);
  }

  /* Get required note for a pipe */
  getRequiredNote(pipe) {
    return pipe.note;
  }

  /* Calculate semitone difference between two frequencies */
  getSemitoneDiff(freq1, freq2) {
    if (!freq1 || !freq2) return Infinity;
    const midi1 = this.freqToMidi(freq1);
    const midi2 = this.freqToMidi(freq2);
    return Math.abs(midi1 - midi2);
  }

  /* Check if a pitch reading is within tolerance of the target note */
  isWithinTolerance(readingMidi, targetMidi) {
    if (readingMidi === null || targetMidi === null) return false;
    const diff = Math.abs(readingMidi - targetMidi);
    return diff <= this.tolerance;
  }

  /* Get the nearest note for a frequency */
  getNearestNote(freq) {
    if (!freq || freq <= 0) return null;
    const midi = this.freqToMidi(freq);
    return this.notes.find(n => Math.abs(this.freqToMidi(n.freq) - midi) < 0.5) || this.notes[0];
  }

  /* Evaluate if a reading passes the tolerance check */
  evaluate(reading, targetNote) {
    if (!reading || !targetNote) {
      return { pass: false, diff: Infinity, within: false };
    }

    const targetMidi = this.freqToMidi(targetNote.freq);
    const readingMidi = this.freqToMidi(reading.frequency);

    const diff = Math.abs(readingMidi - targetMidi);
    const within = diff <= this.tolerance;

    return {
      pass: within,
      diff: diff,
      within: within,
      readingMidi: readingMidi,
      targetMidi: targetMidi
    };
  }

  /* Get MIDI note number for a given frequency */
  freqToMidiNumber(freq) {
    return freqToMidi(freq);
  }

  /* Get frequency for a MIDI note number */
  midiToFrequency(midi) {
    return midiToFreq(midi);
  }
}