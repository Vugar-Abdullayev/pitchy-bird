import { freqToY } from '../audio/constants.js';

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

  /* İki ayrı rejim:
       SƏS VAR  → quş perde hündürlüyünə doğru hamarlanır, cazibə yoxdur
       SƏS YOX  → yalnız cazibə işləyir, hamarlama tamamilə söndürülür

     Əvvəl hər iki qüvvə eyni anda tətbiq olunurdu. Nəticədə sükut zamanı
     hamarlama quşu son notanın hündürlüyündə saxlayır, cazibə isə onu
     aşağı çəkirdi — iki qüvvə ~21 piksel sonra tarazlaşır və quş düşməyi
     dayandırırdı. Bu, A1 düzəlişindən sonra üzə çıxdı (M0). */
  update(deltaMs, reading) {
    const dt = deltaMs / 1000;
    const frameScale = dt * 60;

    this.lastReading = reading;

    const hasSignal = !!(reading && reading.frequency > 0);

    if (hasSignal) {
      this.filteredFreq = reading.frequency;
      this.freqHistory.push(reading.frequency);
      if (this.freqHistory.length > this.maxHistory) {
        this.freqHistory.shift();
      }

      const medianFreq = this.getMedian(this.freqHistory);
      const targetFreq = medianFreq || this.filteredFreq;

      const targetY = freqToY(targetFreq, this.playTop, this.playBottom);
      this.targetY = this.clampY(targetY);

      this.velocity = 0;
      this.y += (this.targetY - this.y) * this.smoothingFactor;
    } else {
      /* Sükut: köhnə frekans tarixçəsi növbəti notanı çirkləndirməsin */
      this.filteredFreq = 0;
      this.freqHistory.length = 0;

      this.velocity = Math.min(this.velocity + this.gravity * frameScale, this.maxFallSpeed);
      this.y += this.velocity * frameScale;
      this.targetY = this.y;
    }

    this.y = this.clampY(this.y);
  }

  clampY(y) {
    return Math.max(
      this.playTop + this.birdRadius,
      Math.min(this.playBottom - this.birdRadius, y)
    );
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