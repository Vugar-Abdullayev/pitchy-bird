import { MIN_FREQ, MAX_FREQ, freqToY, NOTES } from '../audio/constants.js';

export class Bird {
  constructor(options = {}) {
    this.width = options.width || 720;
    this.height = options.height || 480;

    this.playTop = 24;
    this.playBottom = this.height - 24;
    this.birdRadius = 14;
    this.birdX = 150;

    this.y = this.height / 2;
    this.targetY = this.height / 2;
    this.velocity = 0;

    this.smoothingFactor = 0.12;
    this.gravity = 0.018;      // sükut zamanı düşmə sürəti (0.015-0.02 aralığı)
    this.maxFallSpeed = 2.5;   // maksimal düşmə sürəti (2-3 aralığı)

    this.filteredFreq = 0;
    this.freqHistory = [];
    this.maxHistory = 5;

    this.lastReading = null;
  }

  reset() {
    this.y = this.height / 2;
    this.targetY = this.height / 2;
    this.velocity = 0;
    this.filteredFreq = 0;
    this.freqHistory = [];
    this.lastReading = null;
  }

  update(deltaMs, reading) {
    const dt = deltaMs / 1000;

    this.lastReading = reading;

    if (reading && reading.frequency > 0) {
      this.filteredFreq = reading.frequency;
      this.freqHistory.push(reading.frequency);
      if (this.freqHistory.length > this.maxHistory) {
        this.freqHistory.shift();
      }

      const medianFreq = this.getMedian(this.freqHistory);
      const targetFreq = medianFreq || this.filteredFreq;

      const targetY = freqToY(targetFreq, this.playTop, this.playBottom);
      this.targetY = Math.max(this.playTop + this.birdRadius, Math.min(this.playBottom - this.birdRadius, targetY));
    } else {
      this.velocity += this.gravity * dt * 60;
      this.velocity = Math.min(this.velocity, this.maxFallSpeed);
    }

    this.y += (this.targetY - this.y) * this.smoothingFactor + this.velocity * dt * 60;
    this.y = Math.max(this.playTop + this.birdRadius, Math.min(this.playBottom - this.birdRadius, this.y));
  }

  getMedian(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  getY() {
    return this.y;
  }

  getTargetY() {
    return this.targetY;
  }

  getX() {
    return this.birdX;
  }

  getRadius() {
    return this.birdRadius;
  }

  getFilteredFrequency() {
    return this.filteredFreq;
  }

  isAlive() {
    return this.y >= this.playTop + this.birdRadius && this.y <= this.playBottom - this.birdRadius;
  }
}