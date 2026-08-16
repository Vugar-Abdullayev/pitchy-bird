import { GLYPH } from '../game/difficulty.js';
/*
 * ÇƏKİM
 *
 * Bu qat heç bir ölçü TƏYİN ETMİR — hamısını mapping və geometry
 * obyektlərindən alır. Əvvəl boşluq, boru eni və quş radiusu burada
 * TƏKRAR yazılmışdı; toqquşma Pipe-ın rəqəmini, çəkim isə öz
 * rəqəmini işlədirdi. Birini dəyişmək kifayət idi ki, ekranda
 * gördüyün şeylə öldüyün şey ayrılsın.
 */

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  configure({ mapping, geometry, notes, width, height, birdX }) {
    this.mapping = mapping;
    this.geometry = geometry;
    this.notes = notes;
    this.width = width;
    this.height = height;
    this.birdX = birdX;
    this.labelWidth = Math.max(38, Math.min(64, width * 0.06));
  }

  render({ bird, pipes, reading }) {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawStaff();
    this.drawGround();
    this.drawPipes(pipes);
    this.drawBird(bird, reading);
  }

  drawStaff() {
    const ctx = this.ctx;
    const fontPx = Math.max(10, Math.min(15, this.height * 0.018));
    ctx.save();
    ctx.strokeStyle = 'rgba(59,42,32,0.26)';
    ctx.lineWidth = 1;
    ctx.font = fontPx + "px 'EB Garamond', serif";
    ctx.fillStyle = 'rgba(59,42,32,0.62)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    /* Dar ekranda bütün etiketlər sığmır — hər ikinci notanı yazırıq */
    const spacing = this.mapping.centsToPx(100);
    const labelEvery = spacing < fontPx * 1.4 ? 2 : 1;

    this.notes.forEach((note, i) => {
      if (!this.mapping.isVisible(note.freq)) return;
      const y = this.mapping.freqToY(note.freq);

      ctx.beginPath();
      ctx.moveTo(this.labelWidth, y);
      ctx.lineTo(this.width - 10, y);
      ctx.stroke();

      if (i % labelEvery === 0) ctx.fillText(note.name, 8, y);
    });
    ctx.restore();
  }

  /* Zəmin — ən pes notanın altındakı zolaq.
     Görünən olmalıdır ki, boş sahə kimi yox, oyunun bir hissəsi
     kimi oxunsun. */
  drawGround() {
    const ctx = this.ctx;
    const top = this.mapping.playBottom;
    ctx.save();
    ctx.fillStyle = 'rgba(107,74,50,0.10)';
    ctx.fillRect(0, top, this.width, this.mapping.floorY - top);
    ctx.strokeStyle = 'rgba(107,74,50,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.mapping.floorY);
    ctx.lineTo(this.width, this.mapping.floorY);
    ctx.stroke();
    ctx.restore();
  }

  drawPipes(pipes) {
    const ctx = this.ctx;
    const w = this.geometry.widthPx;

    for (const p of pipes.list) {
      const gapTop = pipes.getGapTop(p);
      const gapBottom = pipes.getGapBottom(p);

      ctx.save();
      ctx.fillStyle = '#6B4A32';
      ctx.strokeStyle = 'rgba(43,28,18,0.55)';
      ctx.lineWidth = 1;

      ctx.fillRect(p.x, this.mapping.playTop, w, gapTop - this.mapping.playTop);
      ctx.strokeRect(p.x, this.mapping.playTop, w, gapTop - this.mapping.playTop);

      ctx.fillRect(p.x, gapBottom, w, this.mapping.floorY - gapBottom);
      ctx.strokeRect(p.x, gapBottom, w, this.mapping.floorY - gapBottom);

      ctx.restore();
      this.drawToleranceBand(ctx, p, w);
      ctx.save();

      ctx.fillStyle = 'rgba(140,32,32,0.85)';
      ctx.font = Math.max(11, this.height * 0.02) + "px 'EB Garamond', serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(p.note.name, p.x + w / 2, gapTop - 6);
      ctx.restore();
    }
  }

  /*
   * Boşluğun içindəki HƏQİQİ tolerantlıq zolağı.
   *
   * Quş böyük olduğu üçün boşluq göz üçün olduğundan daha bağışlayan
   * görünür — amma keçmək üçün quşun MƏRKƏZİ bu dar zolağın içində
   * olmalıdır. Şagird nişan alacağı yeri dəqiq görməlidir.
   */
  drawToleranceBand(ctx, p, w) {
    const halfPx = this.mapping.centsToPx(this.geometry.toleranceCents);
    ctx.save();
    ctx.fillStyle = 'rgba(140,32,32,0.07)';
    ctx.fillRect(p.x, p.gapCenterY - halfPx, w, halfPx * 2);
    ctx.strokeStyle = 'rgba(140,32,32,0.30)';
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x, p.gapCenterY);
    ctx.lineTo(p.x + w, p.gapCenterY);
    ctx.stroke();
    ctx.restore();
  }

  /*
   * Oyunçu fiquru — səkkizlik nota (♪).
   *
   * Bütün koordinatlar difficulty.js-dəki GLYPH sabitindən gəlir.
   * Toqquşma da eyni sabitlərdən hesablanır, ona görə görünən forma
   * ilə dəyən forma eynidir: baş, quyruq və bayraq — hamısı.
   *
   * Mərkəz = nota başının mərkəzi = perde.
   */
  drawBird(bird, reading) {
    const ctx = this.ctx;
    const u = this.geometry.glyphUnitPx;
    const hasSignal = !!(reading && reading.frequency > 0);
    const ink = hasSignal ? '#171310' : 'rgba(132,124,116,0.55)';

    ctx.save();
    ctx.translate(this.birdX, bird.getY());
    ctx.scale(u, u);
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;

    /* Quyruq */
    ctx.beginPath();
    ctx.moveTo(GLYPH.stemX, -GLYPH.headExtentY * 0.35);
    ctx.lineTo(GLYPH.stemX, GLYPH.stemTopY);
    ctx.lineWidth = GLYPH.stemWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    /* Bayraq — tək hamar əyri */
    ctx.beginPath();
    ctx.moveTo(GLYPH.stemX, GLYPH.stemTopY);
    ctx.bezierCurveTo(
      GLYPH.stemX + GLYPH.flagW,        GLYPH.stemTopY + GLYPH.flagH * 0.28,
      GLYPH.stemX + GLYPH.flagW * 0.92, GLYPH.stemTopY + GLYPH.flagH * 0.74,
      GLYPH.stemX + GLYPH.flagW * 0.18, GLYPH.stemTopY + GLYPH.flagH
    );
    ctx.bezierCurveTo(
      GLYPH.stemX + GLYPH.flagW * 0.70, GLYPH.stemTopY + GLYPH.flagH * 0.64,
      GLYPH.stemX + GLYPH.flagW * 0.72, GLYPH.stemTopY + GLYPH.flagH * 0.30,
      GLYPH.stemX,                      GLYPH.stemTopY + GLYPH.flagH * 0.26
    );
    ctx.closePath();
    ctx.fill();

    /* Nota başı */
    ctx.beginPath();
    ctx.ellipse(0, 0, GLYPH.headA, GLYPH.headB, GLYPH.headTilt, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}