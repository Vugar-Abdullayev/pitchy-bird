/*
 * TOQQUŞMA
 *
 * Yalnız HƏNDƏSƏ. Əvvəl bu sinif üç iş görürdü: toqquşma, entonasiya
 * mühakiməsi və xal qərarı. Üstəlik Date.now()-u içəridən çağırırdı,
 * ona görə deterministik test etmək mümkün deyildi.
 *
 * İndi entonasiya yoxlaması ayrıca sistem deyil: boşluq onsuz da
 * düzgün notanın hündürlüyündə açılır, deməli boşluqdan keçmək
 * ELƏ entonasiya imtahanıdır. Qərar (Gate B): yalnız divara dəymək
 * öldürür.
 */

export class CollisionSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.lastPassedNote = null;
    this.lastErrorCents = null;
  }

  /*
   * mapping — pikseli sentə çevirmək üçün (geri bildiriş məqsədilə)
   * Qaytarır: { collided, passedPipe, note, errorCents }
   */
  evaluate(bird, pipe, mapping) {
    const birdY = bird.getY();
    const birdX = bird.birdX;
    const g = pipe.geometry;
    const up = g.extentUp;
    const down = g.extentDown;
    const ex = g.extentX;
    const pipeW = g.widthPx;
    const hasSignal = bird.hasSignal();

    let collided = false;
    let passedPipe = false;

    /* Zəmin ÖLDÜRMÜR — ölüm qərarını yalnız borular verir.
       Susan oyunçu zəminə düşür, orada G3 borusunun gövdəsi onu
       gözləyir. Yəni cəzanı fizika yox, notalar verir. */

    for (const p of pipe.list) {
      const overlapsX = birdX + ex > p.x && birdX - ex < p.x + pipeW;

      if (overlapsX) {
        const gapTop = pipe.getGapTop(p);
        const gapBottom = pipe.getGapBottom(p);

        if (birdY - up < gapTop || birdY + down > gapBottom) {
          collided = true;
          break;
        }

        /* Boru boyunca ən pis sapmanı yadda saxla — oyun sonunda
           şagirdə "nə qədər dəqiq idin" demək üçün. */
        if (hasSignal) p.everHadSignal = true;
        const errorPx = Math.abs(birdY - p.gapCenterY);
        const errorCents = mapping.pxToCents(errorPx);
        if (p.worstErrorCents === undefined || errorCents > p.worstErrorCents) {
          p.worstErrorCents = errorCents;
        }
      }

      /* Səssizcə keçmək mümkün olmamalıdır. Zəmin bunu onsuz da
         böyük ölçüdə həll edir, amma bu ikinci qapıdır: nota
         çalınmayıbsa boru "keçilmiş" sayılmır. */
      if (!p.passed && birdX - ex > p.x + pipeW) {
        p.passed = true;
        passedPipe = p.everHadSignal === true;
        this.lastPassedNote = p.note;
        this.lastErrorCents = p.worstErrorCents ?? null;
      }
    }

    return {
      collided,
      passedPipe,
      note: this.lastPassedNote,
      errorCents: this.lastErrorCents
    };
  }
}