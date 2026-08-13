/*
 * PITCH DETECTION KARNESİ
 *
 * Mövcud alqoritmi süni siqnallarla yoxlayır və nəticəni sentlə ölçür.
 * İşə salmaq:  node test/report.mjs
 */

import { PitchDetector } from '../src/audio/PitchDetector.js';
import {
  makeTone, makeSilence, makeNoise, centsBetween,
  TIMBRE, TEST_NOTES, SAMPLE_RATE
} from './signal.js';

const detector = new PitchDetector();
detector.debugLog = false;

/* Bir tembr üçün bütün notaları yoxla */
function runScenario(label, toneOpts) {
  const rows = [];
  for (const note of TEST_NOTES) {
    const buf = makeTone({ freq: note.freq, ...toneOpts });
    const result = detector.correlate(buf, SAMPLE_RATE);

    const found = result.frequency;
    const cents = found ? centsBetween(found, note.freq) : null;
    const ratio = found ? found / note.freq : 0;

    /* Oktav/harmonika səhvi: tapılan tezlik əsas tonun tam qatıdırsa */
    let verdict;
    if (!found) verdict = 'TAPILMADI';
    else if (Math.abs(cents) <= 10) verdict = 'OK';
    else if (Math.abs(cents) <= 50) verdict = 'ZƏİF';
    else if (Math.abs(ratio - Math.round(ratio)) < 0.05 && Math.round(ratio) >= 2)
      verdict = `HARMONİKA x${Math.round(ratio)}`;
    else if (Math.abs(ratio - 0.5) < 0.03) verdict = 'OKTAV AŞAĞI';
    else verdict = 'SƏHV';

    rows.push({ note: note.name, expected: note.freq, found, cents, verdict,
                conf: Math.round(result.confidence) });
  }

  const ok = rows.filter(r => r.verdict === 'OK').length;
  console.log('\n' + '─'.repeat(74));
  console.log(label + '   →   ' + ok + '/' + rows.length + ' düzgün');
  console.log('─'.repeat(74));
  console.log('nota   gözlənilən    tapılan      sent       güvən   nəticə');
  for (const r of rows) {
    console.log(
      r.note.padEnd(6) +
      (r.expected.toFixed(1) + ' Hz').padStart(11) +
      (r.found ? r.found.toFixed(1) + ' Hz' : '—').padStart(12) +
      (r.cents === null ? '—' : (r.cents > 0 ? '+' : '') + r.cents.toFixed(0)).padStart(10) +
      String(r.conf).padStart(9) + '   ' +
      r.verdict
    );
  }
  return { label, ok, total: rows.length, rows };
}

console.log('\n╔' + '═'.repeat(72) + '╗');
console.log('║  PITCHY BIRD — PITCH DETECTION KARNESİ' + ' '.repeat(34) + '║');
console.log('║  Mövcud alqoritm, heç bir dəyişiklik edilmədən' + ' '.repeat(26) + '║');
console.log('╚' + '═'.repeat(72) + '╝');

const summary = [];

summary.push(runScenario(
  '1. TƏMİZ SİNUS  (ideal laboratoriya şəraiti)',
  { harmonics: TIMBRE.pure }));

summary.push(runScenario(
  '2. SKRİPKAYA BƏNZƏR TON  (güclü əsas ton + üst tonlar)',
  { harmonics: TIMBRE.violin }));

summary.push(runScenario(
  '3. SKRİPKA + FON KÜYÜ  (real otaq şəraiti)',
  { harmonics: TIMBRE.violin, noise: 0.02 }));

summary.push(runScenario(
  '4. TELEFON DİNAMİKİ  (əsas ton demək olar ki, yoxdur)',
  { harmonics: TIMBRE.phoneSpeaker }));

/* Vibrato ayrıca ölçülür: vibrato notanı BİLƏRƏKDƏN gəzdirir, ona görə
   anlıq sapmanı "səhv" saymaq yanlışdır. Doğru sual budur:
   ölçmələrin ORTALAMASI hədəfin üstünə oturur, yayılma vibratonun
   dərinliyinə uyğun gəlirmi? */
function runVibrato(depthCents) {
  const vals = [];
  for (let k = 0; k < 24; k++) {
    const long = makeTone({ freq: 440, harmonics: TIMBRE.violin,
      vibratoCents: depthCents, vibratoRate: 5, length: 2048 + k * 400 });
    const r = detector.correlate(long.slice(long.length - 2048), SAMPLE_RATE);
    if (r.frequency) vals.push(centsBetween(r.frequency, 440));
  }
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const spread = Math.max(...vals) - Math.min(...vals);
  const centered = Math.abs(avg) <= 10;
  const tracks = spread > depthCents * 1.2 && spread < depthCents * 2.8;
  console.log('vibrato ±' + depthCents + ' sent'.padEnd(6) +
    '   ortalama: ' + (avg >= 0 ? '+' : '') + avg.toFixed(1) + ' sent' +
    '   yayılma: ' + spread.toFixed(0) + ' sent   ' +
    (centered && tracks ? 'OK — anlıq tezliyi düzgün izləyir' : 'PROBLEM'));
  return { label: '5. VİBRATO', ok: (centered && tracks) ? 1 : 0, total: 1, rows: [] };
}

console.log('\n' + '─'.repeat(74));
console.log('5. VİBRATO  (nota bilərəkdən gəzdirilir — ortalamaya baxırıq)');
console.log('─'.repeat(74));
summary.push(runVibrato(20));
runVibrato(50);

summary.push(runScenario(
  '6. ZƏİF SƏS  (uzaqdan çalınan, amplituda 0.03)',
  { harmonics: TIMBRE.violin, amplitude: 0.03 }));

/* Sükut və küy — bunlarda alqoritm HEÇ NƏ tapmamalıdır */
console.log('\n' + '─'.repeat(74));
console.log('7. YALANÇI POZİTİV YOXLAMASI  (burada nəsə tapmaq = səhv)');
console.log('─'.repeat(74));
const falsePositives = [
  ['tam sükut', makeSilence()],
  ['zəif fon küyü', makeNoise(0.003)],
  ['güclü fon küyü', makeNoise(0.05)]
];
for (const [name, buf] of falsePositives) {
  const r = detector.correlate(buf, SAMPLE_RATE);
  console.log(name.padEnd(20) +
    (r.frequency ? r.frequency.toFixed(1) + ' Hz tapdı  ← YALANÇI POZİTİV' : 'heç nə tapmadı  ← düzgün'));
}

console.log('\n' + '═'.repeat(74));
console.log('YEKUN');
console.log('═'.repeat(74));
for (const s of summary) {
  const pct = Math.round((s.ok / s.total) * 100);
  const bar = '█'.repeat(Math.round(pct / 5)).padEnd(20, '░');
  console.log(bar + ' ' + String(pct).padStart(3) + '%   ' + s.label.split('  ')[0]);
}
console.log('');
