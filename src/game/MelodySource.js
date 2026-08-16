/*
 * MELODİYA MƏNBƏYİ
 *
 * Əvvəl borular Math.random() ilə seçilirdi. İki problem:
 *   1. Monoton — heç bir musiqi məntiqi yoxdur.
 *   2. G3-dən E5-ə iki oktavlıq sıçrayış çıxa bilirdi; yeni başlayan
 *      şagird üçün mənasız və çalınmaz.
 *
 * Burada notalar məşq ŞABLONLARINDAN gəlir: qalxan/enən qamma,
 * arpeggio, qonşu notalar, təkrar. Yəni hər boru ardıcıllığı real
 * skripka məşqinə uyğun gəlir.
 *
 * Gələcəkdə klassik əsərlər modu da eyni interfeysdən qidalanacaq:
 * next() metodunu saxlayıb mənbəyi dəyişmək kifayətdir.
 */

export class MelodySource {
  constructor(notes, level, rng = Math.random) {
    this.setNotes(notes, level);
    this.rng = rng;
  }

  setNotes(notes, level) {
    this.notes = notes.slice();
    this.maxLeap = level ? level.maxLeapSemitones : 4;
    this.queue = [];
    this.lastIndex = null;
  }

  pick(array) {
    return array[Math.floor(this.rng() * array.length)];
  }

  /* Cari notadan maxLeap məsafəsində olan notaların indeksləri */
  reachableIndices(fromIndex) {
    if (fromIndex === null) return this.notes.map((_, i) => i);
    const out = [];
    for (let i = 0; i < this.notes.length; i++) {
      if (i === fromIndex) continue;
      if (Math.abs(this.notes[i].midi - this.notes[fromIndex].midi) <= this.maxLeap) {
        out.push(i);
      }
    }
    return out.length ? out : this.notes.map((_, i) => i);
  }

  buildPhrase() {
    const start = this.lastIndex === null
      ? Math.floor(this.rng() * this.notes.length)
      : this.pick(this.reachableIndices(this.lastIndex));

    const patterns = ['ascend', 'descend', 'arpeggio', 'neighbour', 'hold', 'wander'];
    const pattern = this.pick(patterns);
    const len = 3 + Math.floor(this.rng() * 3);
    const phrase = [];
    let i = start;

    for (let step = 0; step < len; step++) {
      phrase.push(i);
      let next = i;

      switch (pattern) {
        case 'ascend':    next = i + 1; break;
        case 'descend':   next = i - 1; break;
        case 'arpeggio':  next = i + 2; break;
        case 'neighbour': next = step % 2 === 0 ? i + 1 : i - 1; break;
        case 'hold':      next = i; break;
        default:          next = i + (this.rng() < 0.5 ? -1 : 1);
      }

      /* Diapazondan çıxmasın və sıçrayış həddini aşmasın */
      if (next < 0 || next >= this.notes.length ||
          Math.abs(this.notes[next].midi - this.notes[i].midi) > this.maxLeap) {
        next = this.pick(this.reachableIndices(i));
      }
      i = next;
    }

    this.lastIndex = phrase[phrase.length - 1];
    return phrase.map(idx => this.notes[idx]);
  }

  next() {
    if (!this.queue.length) this.queue = this.buildPhrase();
    return this.queue.shift();
  }

  reset() {
    this.queue = [];
    this.lastIndex = null;
  }
}