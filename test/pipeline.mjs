/*
 * TAM ZƏNCİR TESTİ
 *
 * report.mjs yalnız ALQORİTMİ (correlate) yoxlayır.
 * Bu fayl isə oyunun real yolunu yoxlayır:
 *
 *   siqnal → correlate → processFrequencyData → getReading
 *
 * E5 səhvi məhz buna görə gözdən qaçmışdı: alqoritm E5-i düzgün tapırdı,
 * amma sonrakı diapazon süzgəci onu atırdı. Alqoritmi test etmək kifayət
 * deyil — oyuna GEDƏN dəyəri test etmək lazımdır.
 *
 * İşə salmaq:  npm run test:pipeline
 */

import { PitchDetector } from '../src/audio/PitchDetector.js';
import { NOTES } from '../src/audio/constants.js';
import { makeTone, centsBetween, TIMBRE, SAMPLE_RATE } from './signal.js';

let failures = 0;
let checks = 0;

function check(ok, label, detail = '') {
  checks++;
  if (!ok) failures++;
  console.log('  ' + (ok ? 'OK  ' : 'SƏHV') + '  ' + label.padEnd(42) + detail);
}

/* Davamlı çalınan bir notanı simulyasiya edir və oyuna gedən dəyəri qaytarır */
function playSustained(freq, frames = 25, opts = {}) {
  const detector = new PitchDetector();
  detector.debugLog = false;
  const buf = makeTone({ freq, harmonics: TIMBRE.violin, ...opts });

  for (let i = 0; i < frames; i++) {
    detector.processFrequencyData(detector.correlate(buf, SAMPLE_RATE));
  }
  return detector.getReading();
}

console.log('\n' + '═'.repeat(68));
console.log('TAM ZƏNCİR TESTİ — oyuna gedən dəyər yoxlanılır');
console.log('═'.repeat(68));

/* ---- 1. Bütün notalar oyuna çatmalıdır ---- */
console.log('\n1. Hər nota oyuna çatırmı?');
for (const note of NOTES) {
  const r = playSustained(note.freq);
  const cents = r.frequency ? centsBetween(r.frequency, note.freq) : null;
  check(
    r.hasSignal && Math.abs(cents) <= 15,
    note.name + ' (' + note.freq + ' Hz)',
    r.hasSignal ? r.frequency.toFixed(1) + ' Hz, ' + (cents >= 0 ? '+' : '') + cents.toFixed(0) + ' sent'
                : 'OYUNA ÇATMADI'
  );
}

/* ---- 2. Diapazon kənarları: şagird bemol/diyez çalanda nə olur? ---- */
console.log('\n2. Diapazon kənarları (şagird kök çalmır — geri bildiriş almalıdır)');
const edges = [
  ['E5 az diyez  (+20 sent)', 659.25 * Math.pow(2, 20 / 1200)],
  ['E5 çox diyez (+50 sent)', 659.25 * Math.pow(2, 50 / 1200)],
  ['G3 az bemol  (-20 sent)', 196.00 * Math.pow(2, -20 / 1200)],
  ['G3 çox bemol (-50 sent)', 196.00 * Math.pow(2, -50 / 1200)]
];
for (const [label, f] of edges) {
  const r = playSustained(f);
  check(r.hasSignal, label, r.hasSignal ? r.frequency.toFixed(1) + ' Hz' : 'ATILDI — şagird heç nə görmür');
}

/* ---- 3. Diapazondan həqiqətən kənar səslər ATILMALIDIR ---- */
console.log('\n3. Həqiqətən kənar səslər atılırmı? (burada "atıldı" DÜZGÜNDÜR)');
for (const [label, f] of [['kişi səsi ~120 Hz', 120], ['çox iti səs ~1000 Hz', 1000]]) {
  const r = playSustained(f);
  check(!r.hasSignal, label, r.hasSignal ? 'OYUNA GETDİ — səhv' : 'atıldı');
}

/* ---- 4. Nota dəyişimi: böyük sıçrayış neçə kadra oturur? ---- */
console.log('\n4. Nota dəyişimi (oktav qoruyucusu böyük sıçrayışı bloklayırmı?)');
function measureJump(fromFreq, toFreq) {
  const d = new PitchDetector();
  d.debugLog = false;
  const a = makeTone({ freq: fromFreq, harmonics: TIMBRE.violin });
  const b = makeTone({ freq: toFreq, harmonics: TIMBRE.violin });

  for (let i = 0; i < 25; i++) d.processFrequencyData(d.correlate(a, SAMPLE_RATE));

  for (let i = 1; i <= 60; i++) {
    d.processFrequencyData(d.correlate(b, SAMPLE_RATE));
    const r = d.getReading();
    if (r.frequency && Math.abs(centsBetween(r.frequency, toFreq)) <= 25) return i;
  }
  return -1;
}
const jumps = [
  ['qonşu nota  G4→A4', 392, 440],
  ['bir oktav   G3→G4', 196, 392],
  ['böyük sıçrayış G3→E5', 196, 659.25],
  ['aşağı sıçrayış E5→G3', 659.25, 196]
];
for (const [label, a, b] of jumps) {
  const frames = measureJump(a, b);
  check(frames > 0 && frames <= 20, label,
    frames < 0 ? 'HEÇ OTURMADI (60 kadr)' : frames + ' kadr (~' + Math.round(frames * 16.7) + ' ms)');
}

/* ---- 5. Sükut ---- */
console.log('\n5. Sükut oyuna çatırmı?');
{
  const d = new PitchDetector();
  d.debugLog = false;
  const tone = makeTone({ freq: 440, harmonics: TIMBRE.violin });
  for (let i = 0; i < 25; i++) d.processFrequencyData(d.correlate(tone, SAMPLE_RATE));
  check(d.getReading().hasSignal, 'səs varkən siqnal var', d.getReading().frequency.toFixed(1) + ' Hz');

  const silence = new Float32Array(2048);
  for (let i = 0; i < 10; i++) d.processFrequencyData(d.correlate(silence, SAMPLE_RATE));
  const r = d.getReading();
  check(!r.hasSignal && r.frequency === 0, 'sükutdan sonra siqnal yoxdur',
    r.hasSignal ? 'HƏLƏ DƏ ' + r.frequency.toFixed(1) + ' Hz göstərir' : 'frequency = 0');
}

console.log('\n' + '═'.repeat(68));
console.log(failures === 0
  ? 'HAMISI KEÇDİ  (' + checks + ' yoxlama)'
  : failures + ' YOXLAMA UĞURSUZ  (' + checks + ' yoxlamadan)');
console.log('═'.repeat(68) + '\n');

process.exit(failures === 0 ? 0 : 1);
