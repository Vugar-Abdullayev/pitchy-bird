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

    // Cached drawing resources for performance
    this._pipeGradients = null;
    this._capGradients = null;
    this._toleranceFillStyle = null;
    this._toleranceStrokeStyle = null;
    this._pipeBodyStrokeStyle = null;
  }

  configure({ mapping, geometry, notes, width, height, birdX }) {
    this.mapping = mapping;
    this.geometry = geometry;
    this.notes = notes;
    this.width = width;
    this.height = height;
    this.birdX = birdX;
    this.labelWidth = Math.max(38, Math.min(64, width * 0.06));

    // Pre-create and cache gradients once on configure/resize
    this._createCachedGradients();
  }

  _createCachedGradients() {
    const ctx = this.ctx;
    const w = this.geometry?.widthPx ?? 60;
    const playTop = this.mapping?.playTop ?? 0;
    const playBottom = this.mapping?.playBottom ?? this.height;
    const floorY = this.mapping?.floorY ?? this.height;

    // Pipe body gradient (vertical shading for 3D depth)
    // Walnut base with lighter top edge, darker bottom edge
    this._pipeGradients = {
      top: ctx.createLinearGradient(0, playTop, w, playTop),
      bottom: ctx.createLinearGradient(0, playBottom, w, playBottom)
    };

    // Top pipe gradient: lighter at top (highlight), darker at gap edge
    this._pipeGradients.top.addColorStop(0, '#8B6914');      // gold highlight at top
    this._pipeGradients.top.addColorStop(0.15, '#6B4A32');   // walnut
    this._pipeGradients.top.addColorStop(0.7, '#5C4030');    // walnut main
    this._pipeGradients.top.addColorStop(1, '#3E2A1F');      // walnut-dark at gap edge

    // Bottom pipe gradient: darker at top (gap edge), lighter at bottom
    this._pipeGradients.bottom.addColorStop(0, '#3E2A1F');   // walnut-dark at gap edge
    this._pipeGradients.bottom.addColorStop(0.3, '#5C4030'); // walnut main
    this._pipeGradients.bottom.addColorStop(0.85, '#6B4A32'); // walnut
    this._pipeGradients.bottom.addColorStop(1, '#8B6914');   // gold highlight at bottom

    // End cap / lip gradients (horizontal for the cap rim)
    this._capGradients = {
      top: ctx.createLinearGradient(0, 0, w, 0),
      bottom: ctx.createLinearGradient(0, 0, w, 0)
    };

    // Top cap: lighter left (highlight), darker right (shadow)
    this._capGradients.top.addColorStop(0, '#A68030');
    this._capGradients.top.addColorStop(0.5, '#6B4A32');
    this._capGradients.top.addColorStop(1, '#3E2A1F');

    // Bottom cap: darker left, lighter right
    this._capGradients.bottom.addColorStop(0, '#3E2A1F');
    this._capGradients.bottom.addColorStop(0.5, '#5C4030');
    this._capGradients.bottom.addColorStop(1, '#A68030');

    // Tolerance band styles (cached)
    this._toleranceFillStyle = 'rgba(140,32,32,0.07)';
    this._toleranceStrokeStyle = 'rgba(140,32,32,0.30)';

    // Pipe body stroke (subtle edge definition)
    this._pipeBodyStrokeStyle = 'rgba(43,28,18,0.55)';
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
    const capHeight = Math.max(6, Math.min(14, w * 0.22)); // End cap height

    for (const p of pipes.list) {
      const gapTop = pipes.getGapTop(p);
      const gapBottom = pipes.getGapBottom(p);

      ctx.save();

      // ── TOP PIPE ──
      // Main body with gradient
      ctx.fillStyle = this._pipeGradients.top;
      ctx.fillRect(p.x, this.mapping.playTop, w, gapTop - this.mapping.playTop);

      // End cap / lip at gap edge (extends slightly wider than pipe)
      const capOverhang = Math.max(3, w * 0.08);
      const capX = p.x - capOverhang;
      const capW = w + capOverhang * 2;
      const capY = gapTop - capHeight;

      // Cap shadow (bottom edge of cap)
      ctx.fillStyle = 'rgba(62,42,31,0.45)';
      ctx.fillRect(capX, gapTop - 2, capW, 2);

      // Cap body with horizontal gradient
      ctx.fillStyle = this._capGradients.top;
      ctx.fillRect(capX, capY, capW, capHeight);

      // Cap highlight (top edge)
      ctx.fillStyle = 'rgba(166,128,48,0.6)';
      ctx.fillRect(capX, capY, capW, 1.5);

      // Pipe body right edge highlight (vertical catch light)
      ctx.fillStyle = 'rgba(139,105,20,0.35)';
      ctx.fillRect(p.x + w - 2, this.mapping.playTop, 2, gapTop - this.mapping.playTop);

      // Pipe body left edge shadow
      ctx.fillStyle = 'rgba(62,42,31,0.25)';
      ctx.fillRect(p.x, this.mapping.playTop, 2, gapTop - this.mapping.playTop);

      // ── BOTTOM PIPE ──
      // Main body with gradient
      ctx.fillStyle = this._pipeGradients.bottom;
      ctx.fillRect(p.x, gapBottom, w, this.mapping.floorY - gapBottom);

      // End cap / lip at gap edge
      const capYBottom = gapBottom;

      // Cap shadow (top edge of cap)
      ctx.fillStyle = 'rgba(62,42,31,0.45)';
      ctx.fillRect(capX, gapBottom, capW, 2);

      // Cap body with horizontal gradient
      ctx.fillStyle = this._capGradients.bottom;
      ctx.fillRect(capX, capYBottom, capW, capHeight);

      // Cap highlight (bottom edge)
      ctx.fillStyle = 'rgba(166,128,48,0.5)';
      ctx.fillRect(capX, capYBottom + capHeight - 1.5, capW, 1.5);

      // Pipe body right edge highlight
      ctx.fillStyle = 'rgba(139,105,20,0.35)';
      ctx.fillRect(p.x + w - 2, gapBottom, 2, this.mapping.floorY - gapBottom);

      // Pipe body left edge shadow
      ctx.fillStyle = 'rgba(62,42,31,0.25)';
      ctx.fillRect(p.x, gapBottom, 2, this.mapping.floorY - gapBottom);

      // Subtle stroke around pipe bodies for definition
      ctx.strokeStyle = this._pipeBodyStrokeStyle;
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x, this.mapping.playTop, w, gapTop - this.mapping.playTop);
      ctx.strokeRect(p.x, gapBottom, w, this.mapping.floorY - gapBottom);

      // Cap strokes
      ctx.strokeRect(capX, capY, capW, capHeight);
      ctx.strokeRect(capX, capYBottom, capW, capHeight);

      ctx.restore();

      // Draw tolerance band (inside gap)
      this.drawToleranceBand(ctx, p, w);

      // Draw note label with improved readability
      this.drawNoteLabel(ctx, p, w, gapTop);
    }
  }

  drawNoteLabel(ctx, p, w, gapTop) {
    ctx.save();

    // Label positioned centered on pipe, above the top cap
    const labelX = p.x + w / 2;
    const labelY = gapTop - 10; // Above the cap with padding

    // Background for readability - semi-transparent dark rounded rect
    const fontSize = Math.max(12, Math.min(18, this.height * 0.022));
    ctx.font = `600 ${fontSize}px 'Cormorant Garamond', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    const textMetrics = ctx.measureText(p.note.name);
    const textWidth = textMetrics.width;
    const paddingX = 8;
    const paddingY = 4;
    const bgWidth = textWidth + paddingX * 2;
    const bgHeight = fontSize + paddingY * 2;
    const bgX = labelX - bgWidth / 2;
    const bgY = labelY - bgHeight - 2;

    // Background with good contrast
    ctx.fillStyle = 'rgba(59,42,32,0.85)';
    ctx.beginPath();
    const radius = 4;
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, radius);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = 'rgba(166,128,48,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Note text - high contrast gold/cream
    ctx.fillStyle = '#F5E6C8'; // parchment-light/gold-tinted
    ctx.fillText(p.note.name, labelX, labelY);

    ctx.restore();
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
    ctx.fillStyle = this._toleranceFillStyle;
    ctx.fillRect(p.x, p.gapCenterY - halfPx, w, halfPx * 2);
    ctx.strokeStyle = this._toleranceStrokeStyle;
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