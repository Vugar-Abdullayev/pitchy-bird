import { freqToY, NOTES } from '../audio/constants.js';

export class Pipe {
  constructor(notes, options = {}) {
    this.notes = notes || NOTES;
    this.width = options.width || 720;
    this.height = options.height || 480;

    this.playTop = 24;
    this.playBottom = this.height - 24;

    this.pipeWidth = 46;
    this.pipeGap = 140;
    this.pipeSpeed = 2.6;
    this.spawnX = this.width + 40;

    this.list = [];
    this.passedNote = null;
    this.difficulty = 0;
  }

  reset() {
    this.list = [];
    this.pipeSpeed = 2.6;
    this.difficulty = 0;
    this.spawnPipe();
  }

  spawnPipe() {
    const note = this.notes[Math.floor(Math.random() * this.notes.length)];
    const gapCenterY = freqToY(note.freq, this.playTop, this.playBottom);

    this.list.push({
      x: this.spawnX,
      note: note,
      gapCenterY: gapCenterY,
      passed: false
    });
  }

  update(deltaMs) {
    const speed = this.pipeSpeed + this.difficulty * 0.1;

    this.list.forEach(p => {
      p.x -= speed;
    });

    if (this.list.length && this.list[this.list.length - 1].x < this.width - 280) {
      this.spawnPipe();
    }

    this.list = this.list.filter(p => p.x > -this.pipeWidth - 20);
  }

  increaseDifficulty() {
    this.difficulty = Math.min(5, this.difficulty + 1);
    this.pipeSpeed = Math.min(5.2, this.pipeSpeed + 0.06);
  }

  getGapTop(pipe) {
    return pipe.gapCenterY - this.pipeGap / 2;
  }

  getGapBottom(pipe) {
    return pipe.gapCenterY + this.pipeGap / 2;
  }

  getCurrentRequiredNote() {
    for (const p of this.list) {
      if (p.x > 0 && p.x < this.spawnX) {
        return p.note;
      }
    }
    return null;
  }
}