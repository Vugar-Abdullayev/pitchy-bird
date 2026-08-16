/*
 * BORULAR
 *
 * Bütün ölçülər difficulty.js-dən gəlir — burada sabit rəqəm yoxdur.
 * Əvvəl pipeGap=140, pipeWidth=46 kimi rəqəmlər həm burada, həm
 * Bird-də, həm Renderer-də ayrıca yazılmışdı; birini dəyişəndə
 * digərləri səssizcə fərqlənirdi.
 *
 * Hərəkət deltaMs ilə hesablanır. Əvvəl kadr başına sabit piksel
 * idi — 120 Hz ekranda oyun iki dəfə sürətli işləyirdi.
 */

export class Pipe {
  constructor({ mapping, level, geometry, melody, width }) {
    this.configure({ mapping, level, geometry, melody, width });
    this.list = [];
    this.timeSinceSpawn = 0;
  }

  configure({ mapping, level, geometry, melody, width }) {
    this.mapping = mapping;
    this.level = level;
    this.geometry = geometry;
    this.melody = melody;
    this.width = width;
    this.spawnX = width + 40;
  }

  reset() {
    this.list = [];
    this.timeSinceSpawn = 0;
    this.melody.reset();
    this.spawnPipe();
  }

  spawnPipe() {
    const note = this.melody.next();
    if (!note) return;

    /* Boşluq həmişə düzgün notanın TAM hündürlüyündə açılır.
       Təsadüfi yerdəyişmə YOXDUR — əks halda şagird öz səhvi ilə
       oyunun kaprizini ayırd edə bilməz. */
    const gapCenterY = this.mapping.freqToY(note.freq);

    this.list.push({
      x: this.spawnX,
      note,
      gapCenterY,
      passed: false,
      cleared: true          // boru boyunca entonasiya təmiz qaldımı
    });
  }

  update(deltaMs) {
    const dt = deltaMs / 1000;
    const dx = this.level.scrollSpeedPxPerSec * dt;

    for (const p of this.list) p.x -= dx;

    this.timeSinceSpawn += deltaMs;
    if (this.timeSinceSpawn >= this.level.gapSpacingMs) {
      this.timeSinceSpawn = 0;
      this.spawnPipe();
    }

    this.list = this.list.filter(p => p.x > -this.geometry.widthPx - 20);
  }

  /* Boşluq mərkəzə görə simmetrik DEYİL — nota qlifi simmetrik
     olmadığı üçün. Nota başı hər halda mərkəzdə ±tolerantlıq
     sərbəstliyi ilə hərəkət edir. */
  getGapTop(pipe) {
    return pipe.gapCenterY - this.geometry.gapAbovePx;
  }

  /* Borunun aşağı gövdəsi zəminə qədər uzanır */
  getFloor() {
    return this.mapping.floorY;
  }

  getGapBottom(pipe) {
    return pipe.gapCenterY + this.geometry.gapBelowPx;
  }

  getCurrentRequiredNote() {
    for (const p of this.list) {
      if (p.x + this.geometry.widthPx > 0 && !p.passed) return p.note;
    }
    return null;
  }
}