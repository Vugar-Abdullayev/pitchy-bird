import { midiToNoteName } from '../audio/constants.js';

export class HUD {
  constructor() {
    this.scoreEl = document.getElementById('scoreEl');
    this.pitchEl = document.getElementById('pitchEl');
    this.startOverlay = document.getElementById('startOverlay');
    this.overOverlay = document.getElementById('overOverlay');
    this.finalScore = document.getElementById('finalScore');
    this.overNote = document.getElementById('overNote');
    this.micStatus = document.getElementById('micStatus');
    this.legend = document.getElementById('legend');
    this.startBtn = document.getElementById('startBtn');
    this.retryBtn = document.getElementById('retryBtn');

    // Əvvəlki vəziyyətləri yadda saxlamaq
    this.currentScore = 0;
  }

  setScore(score) {
    this.scoreEl.textContent = score;
  }

  setMicStatus(message) {
    this.micStatus.textContent = message;
  }

  hideOverlays() {
    this.startOverlay.style.display = 'none';
    this.overOverlay.style.display = 'none';
  }

  showGameOver(score) {
    this.overOverlay.style.display = 'flex';
    this.finalScore.textContent = score;
    this.overNote.textContent =
      score === 0
        ? 'Boruların arasından keçmək üçün lazımi notanı dəqiq tut.'
        : 'Yaxşı nəticə! Diapazonu genişləndirmək üçün yenidən cəhd et.';
  }

  updateDebug(data) {
    if (!this.pitchEl) return;

    const rawFreq = data.rawFrequency ? Math.round(data.rawFrequency) : 0;
    const filteredFreq = data.filteredFrequency ? Math.round(data.filteredFrequency) : 0;
    const detectedNote = data.detectedNote !== null ? midiToNoteName(data.detectedNote) : '—';
    const requiredNoteName = data.requiredNote ? data.requiredNote.name || data.requiredNote : '—';
    const semitoneDiff = data.semitoneDiff !== null && data.semitoneDiff !== Infinity ? Math.abs(data.semitoneDiff).toFixed(2) : '∞';

    this.pitchEl.innerHTML = `
      ${rawFreq} Hz <br>
      <b>${detectedNote}</b> <br>
      ${filteredFreq} Hz (filtered) <br>
      <b>${requiredNoteName}</b> (target) <br>
      ${semitoneDiff} st (diff)
    `;
  }
}