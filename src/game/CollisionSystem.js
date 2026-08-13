import { TOLERANCE_SEMITONES } from '../audio/constants.js';

export class CollisionSystem {
  constructor(noteMatcher, tolerance = TOLERANCE_SEMITONES) {
    this.noteMatcher = noteMatcher;
    this.tolerance = tolerance;
    this.lastSemitoneDiff = Infinity;
    this.lastPass = false;
    this.readingHistory = []; // { timestamp, frequency } — sliding window
    this.windowMs = 280;      // 200-300ms pəncərə (median hesabı üçün)
  }

  reset() {
    this.lastSemitoneDiff = Infinity;
    this.lastPass = false;
    this.readingHistory = [];
  }

  /* Hər frame son tutulan reading-i pəncərəyə yaz, köhnələri sil */
  recordReading(reading, now) {
    if (reading && reading.frequency > 0) {
      this.readingHistory.push({
        timestamp: reading.timestamp || now,
        frequency: reading.frequency
      });
    }
    const cutoff = now - this.windowMs;
    while (this.readingHistory.length && this.readingHistory[0].timestamp < cutoff) {
      this.readingHistory.shift();
    }
  }

  /* Pəncərədəki reading-lərin target nota qarşı median semitone fərqi */
  medianSemitoneDiff(targetFreq) {
    const diffs = this.readingHistory
      .filter(r => r.frequency > 0)
      .map(r => this.noteMatcher.getSemitoneDiff(r.frequency, targetFreq));
    if (!diffs.length) return Infinity;
    const sorted = [...diffs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  evaluate(bird, pipe) {
    const now = Date.now();
    const reading = bird.lastReading;

    // Pəncərəni cari reading ilə yenilə (median üçün lazımdır)
    this.recordReading(reading, now);

    const birdY = bird.getY();
    const birdRadius = bird.getRadius();

    let collided = false;
    let passedPipe = false;

    for (const p of pipe.list) {
      const withinX = bird.birdX + birdRadius > p.x &&
                      bird.birdX - birdRadius < p.x + pipe.pipeWidth;

      if (withinX) {
        const gapTop = pipe.getGapTop(p);
        const gapBottom = pipe.getGapBottom(p);
        if (birdY - birdRadius < gapTop || birdY + birdRadius > gapBottom) {
          collided = true;
          break;
        }
      }

      // Pipe keçildiyi an: median semitone fərqinə görə qərar ver
      if (!p.passed && p.x + pipe.pipeWidth < bird.birdX - birdRadius) {
        p.passed = true;

        /* Nota fərqi yalnız GERİ BİLDİRİŞ üçün hesablanır — ölüm səbəbi deyil.
           Qərar (Gate B): yalnız divara dəymək öldürür, səhv nota yox.
           Boşluq onsuz da düzgün notanın hündürlüyündə açılır, yəni
           entonasiya yoxlaması artıq həndəsənin içindədir. */
        const medianDiff = this.medianSemitoneDiff(p.note.freq);
        this.lastSemitoneDiff = medianDiff;
        this.lastPass = medianDiff <= this.tolerance;

        passedPipe = true;
      }
    }

    return {
      collided,
      passedPipe,
      semitoneDiff: this.lastSemitoneDiff,
      passed: this.lastPass
    };
  }

  getLastSemitoneDiff() {
    return this.lastSemitoneDiff;
  }
}