/*
 * QUŞ
 *
 * Mövqe tamamilə perdədən gəlir. Ölçülər difficulty.js-dən —
 * burada sabit rəqəm yoxdur.
 *
 * İki ayrı rejim, heç vaxt eyni anda:
 *   SƏS VAR → perdəyə doğru hamarlanır, cazibə yoxdur
 *   SƏS YOX → yalnız cazibə, hamarlama tamam söndürülür
 */

export class Bird {
  constructor({ mapping, geometry, birdX }) {
    this.configure({ mapping, geometry, birdX });
    this.reset();
  }

  configure({ mapping, geometry, birdX }) {
    this.mapping = mapping;
    this.geometry = geometry;
    this.extentUp = geometry.extentUp;
    this.extentDown = geometry.extentDown;
    this.birdX = birdX;

    this.smoothingFactor = 0.35;
    this.gravity = 0.02;
    this.maxFallSpeed = 2.8;
    this.maxHistory = 5;
  }

  reset() {
    const mid = (this.mapping.playTop + this.mapping.playBottom) / 2;
    this.y = mid;
    this.targetY = mid;
    this.velocity = 0;
    this.filteredFreq = 0;
    this.freqHistory = [];
    this.lastReading = null;
  }

  /* Quş oyun sahəsindən çıxa bilməz. Sərhəddə DAYANMAQ ölüm demək
     deyil — ölüm qərarını CollisionSystem verir (döşəmə/tavan). */
  clampY(y) {
    return Math.max(
      this.mapping.playTop + this.extentUp,
      Math.min(this.mapping.floorY - this.extentDown, y)
    );
  }


  getMedian(values) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  update(deltaMs, reading) {
    const frameScale = (deltaMs / 1000) * 60;
    this.lastReading = reading;

    const hasSignal = !!(reading && reading.frequency > 0);

    if (hasSignal) {
      this.filteredFreq = reading.frequency;
      this.freqHistory.push(reading.frequency);
      if (this.freqHistory.length > this.maxHistory) this.freqHistory.shift();

      const targetFreq = this.getMedian(this.freqHistory) || this.filteredFreq;
      this.targetY = this.clampY(this.mapping.freqToY(targetFreq));

      this.velocity = 0;
      this.y += (this.targetY - this.y) * this.smoothingFactor;
    } else {
      this.filteredFreq = 0;
      this.freqHistory.length = 0;

      this.velocity = Math.min(this.velocity + this.gravity * frameScale, this.maxFallSpeed);
      this.y += this.velocity * frameScale;
      this.targetY = this.y;
    }

    this.y = this.clampY(this.y);
  }

  getY() { return this.y; }
  hasSignal() { return this.filteredFreq > 0; }
}