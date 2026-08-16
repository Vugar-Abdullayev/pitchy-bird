export class HUD {
  constructor() {
    this.scoreEl = document.getElementById('scoreEl');
    this.pitchEl = document.getElementById('pitchEl');
    this.startOverlay = document.getElementById('startOverlay');
    this.overOverlay = document.getElementById('overOverlay');
    this.finalScore = document.getElementById('finalScore');
    this.overNote = document.getElementById('overNote');
    this.micStatus = document.getElementById('micStatus');
    this.startBtn = document.getElementById('startBtn');
    this.retryBtn = document.getElementById('retryBtn');

    this.levelName = '';
    this.buildReadout();
  }

  /* Panel bir dəfə qurulur, sonra yalnız mətn dəyişir.
     Əvvəl hər kadrda innerHTML yazılırdı — saniyədə 60 dəfə
     DOM parse etmək lazımsızdır. */
  buildReadout() {
    if (!this.pitchEl) return;
    this.pitchEl.innerHTML =
      '<div class="ro-freq"><span data-freq>—</span> Hz</div>' +
      '<div class="ro-note"><b data-note>—</b></div>' +
      '<div class="ro-sub"><b data-target>—</b> hədəf</div>' +
      '<div class="ro-sub"><span data-diff>-- st</span></div>' +
      '<div class="ro-level" data-level></div>';

    this.elFreq = this.pitchEl.querySelector('[data-freq]');
    this.elNote = this.pitchEl.querySelector('[data-note]');
    this.elTarget = this.pitchEl.querySelector('[data-target]');
    this.elDiff = this.pitchEl.querySelector('[data-diff]');
    this.elLevel = this.pitchEl.querySelector('[data-level]');
  }

  setScore(score) { this.scoreEl.textContent = score; }
  setMicStatus(message) { this.micStatus.textContent = message; }

  setLevel(level) {
    this.levelName = level ? level.name + ' · ±' + level.toleranceCents + ' sent' : '';
    if (this.elLevel) this.elLevel.textContent = this.levelName;
  }

  hideOverlays() {
    this.startOverlay.style.display = 'none';
    this.overOverlay.style.display = 'none';
  }

  showStartOverlay() {
    this.overOverlay.style.display = 'none';
    this.startOverlay.style.display = 'flex';
  }

  showGameOver(score) {
    this.overOverlay.style.display = 'flex';
    this.finalScore.textContent = score;
    this.overNote.textContent = score === 0
      ? 'Boruların arasından keçmək üçün lazımi notanı dəqiq tut.'
      : 'Yaxşı nəticə! Daha dəqiq entonasiya ilə növbəti səviyyəyə keç.';
  }

  /*
   * Gözlənilən sahələr — main.js tam bu adlarla göndərməlidir:
   *   frequency   oyunu idarə edən tezlik (0 = səs yoxdur)
   *   noteName    həmin tezliyin nota adı (null = yoxdur)
   *   targetName  hazırkı borunun tələb etdiyi nota (null = boru yoxdur)
   *   errorCents  sapma, sentlə (null = ölçüləcək boru yoxdur)
   *
   * Əvvəl bu sözləşmə pozulmuşdu: HUD `filteredFrequency` gözləyirdi,
   * main.js `filteredFreq` göndərirdi — ona görə həmişə 0 görünürdü.
   * `detectedNote` isə heç göndərilmirdi, ona görə "undefined" yazılırdı.
   */
  updateDebug({ frequency, noteName, targetName, errorCents }) {
    if (!this.elFreq) return;

    this.elFreq.textContent = frequency > 0 ? Math.round(frequency) : '—';
    this.elNote.textContent = noteName || '—';
    this.elTarget.textContent = targetName || '—';

    if (errorCents === null || errorCents === undefined || !isFinite(errorCents)) {
      this.elDiff.textContent = '-- st';
      this.elDiff.className = '';
    } else {
      const st = errorCents / 100;
      this.elDiff.textContent = (st >= 0 ? '+' : '') + st.toFixed(2) + ' st';
      this.elDiff.className = Math.abs(errorCents) <= 50 ? 'ok' : 'off';
    }
  }
}