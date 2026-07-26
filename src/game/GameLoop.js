export class GameLoop {
  constructor(callback) {
    this.callback = callback;
    this.running = false;
    this.lastTimestamp = 0;
    this.animationFrameId = null;
  }

  start() {
    if (this.running) return;

    this.running = true;
    this.lastTimestamp = 0;
    this.loop = (timestamp) => {
      if (!this.running) return;

      const deltaMs = this.lastTimestamp ? timestamp - this.lastTimestamp : 16.7;
      this.lastTimestamp = timestamp;

      this.callback(deltaMs);

      this.animationFrameId = requestAnimationFrame(this.loop);
    };

    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  reset() {
    this.lastTimestamp = 0;
  }
}