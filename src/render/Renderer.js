import { NOTES, MIN_FREQ, MAX_FREQ, freqToY } from '../audio/constants.js';

export class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = options.width || canvas.width;
    this.height = options.height || canvas.height;

    this.noteMarginL = 46;
    this.playTop = 24;
    this.playBottom = this.height - 24;
    this.pipeGap = 140;
    this.pipeWidth = 46;
    this.birdRadius = 14;
    this.birdX = 150;
  }

  /* Statik staff çəkimi (başlangıç üçün) */
  renderStatic(notes) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawStaff(notes);
  }

  /* Tam render funksiyası */
  render({ bird, pipes, reading, requiredNote }) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawStaff(NOTES);
    this.drawPipes(pipes, requiredNote);
    this.drawBird(bird, reading);
  }

  drawStaff(notes) {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(59,42,32,0.28)';
    this.ctx.lineWidth = 1;
    this.ctx.font = "13px 'EB Garamond', serif";
    this.ctx.fillStyle = 'rgba(59,42,32,0.65)';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';

    notes.forEach(n => {
      const y = freqToY(n.freq, this.playTop, this.playBottom);
      this.ctx.beginPath();
      this.ctx.moveTo(this.noteMarginL, y);
      this.ctx.lineTo(this.width - 10, y);
      this.ctx.stroke();
      this.ctx.fillText(n.name, 8, y);
    });
    this.ctx.restore();
  }

  drawPipes(pipes, requiredNote) {
    pipes.forEach(p => this.drawPipe(p));
  }

  drawPipe(p) {
    const gapTop = p.gapCenterY - this.pipeGap / 2;
    const gapBottom = p.gapCenterY + this.pipeGap / 2;

    this.ctx.save();
    const grad = this.ctx.createLinearGradient(p.x, 0, p.x + this.pipeWidth, 0);
    grad.addColorStop(0, '#6b4a36');
    grad.addColorStop(0.5, '#5C4030');
    grad.addColorStop(1, '#4a3226');
    this.ctx.fillStyle = grad;

    // top pillar
    this.ctx.fillRect(p.x, this.playTop - 10, this.pipeWidth, Math.max(0, gapTop - (this.playTop - 10)));
    // bottom pillar
    this.ctx.fillRect(p.x, gapBottom, this.pipeWidth, Math.max(0, (this.playBottom + 10) - gapBottom));

    // scroll caps — kəpənəq körləkləri
    this.ctx.fillStyle = '#3E2A1F';
    this.ctx.fillRect(p.x - 3, gapTop - 14, this.pipeWidth + 6, 14);
    this.ctx.fillRect(p.x - 3, gapBottom, this.pipeWidth + 6, 14);

    // not siyahısı
    this.ctx.fillStyle = '#7A2333';
    this.ctx.font = "bold 15px 'Cormorant Garamond', serif";
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(p.note.name, p.x + this.pipeWidth / 2, p.gapCenterY);
    this.ctx.restore();
  }

  drawBird(bird, reading) {
    const hasSignal = reading && reading.frequency > 0;
    this.ctx.save();
    this.ctx.translate(bird.birdX, bird.y);
    this.ctx.fillStyle = hasSignal ? '#C9A44C' : '#9c8256';
    this.ctx.strokeStyle = '#3E2A1F';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 8, 9, 6.5, -0.35, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(7, 4);
    this.ctx.lineTo(7, -24);
    this.ctx.lineTo(10, -24);
    this.ctx.quadraticCurveTo(16, -16, 9, -8);
    this.ctx.lineTo(9, 4);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }
}