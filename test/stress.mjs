import { PitchDetector } from '../src/audio/PitchDetector.js';
import { makeTone, makeNoise, centsBetween, TIMBRE, TEST_NOTES, SAMPLE_RATE } from './signal.js';
const d = new PitchDetector(); d.debugLog = false;

function trial(opts, seeds=[1,7,42,99,2024,31337]) {
  let ok=0, tot=0, worst=0, oct=0;
  for (const seed of seeds) for (const n of TEST_NOTES) {
    const buf = makeTone({ freq:n.freq, seed, ...opts });
    const r = d.correlate(buf, SAMPLE_RATE); tot++;
    if (!r.frequency) continue;
    const c = centsBetween(r.frequency, n.freq);
    if (Math.abs(c) <= 20) { ok++; worst = Math.max(worst, Math.abs(c)); }
    else if (Math.abs(Math.abs(c)-1200) < 60 || Math.abs(Math.abs(c)-1902) < 60) oct++;
  }
  return { pct: Math.round(ok/tot*100), worst: worst.toFixed(1), oct };
}

const cases = [
  ['skripka, küysüz',              { harmonics: TIMBRE.violin }],
  ['skripka + küy 0.02',           { harmonics: TIMBRE.violin, noise: 0.02 }],
  ['skripka + küy 0.05 (güclü)',   { harmonics: TIMBRE.violin, noise: 0.05 }],
  ['skripka + küy 0.10 (çox güclü)',{ harmonics: TIMBRE.violin, noise: 0.10 }],
  ['telefon dinamiki',             { harmonics: TIMBRE.phoneSpeaker }],
  ['telefon dinamiki + küy',       { harmonics: TIMBRE.phoneSpeaker, noise: 0.02 }],
  ['zəif əsas ton',                { harmonics: TIMBRE.weakFundamental }],
  ['zəif səs (amp 0.02)',          { harmonics: TIMBRE.violin, amplitude: 0.02 }],
  ['zəif səs + küy',               { harmonics: TIMBRE.violin, amplitude: 0.02, noise: 0.01 }],
  ['DC sürüşmə 0.1',               { harmonics: TIMBRE.violin, dcOffset: 0.1 }],
  // Qeyd: ±50 sent vibrato notanı ±50 sent gəzdirir, ona görə anlıq sapma
  // TƏBİİDİR. Onun düzgün ölçüsü report.mjs-dədir (ortalama + yayılma).
  ['vibrato ±20 sent',             { harmonics: TIMBRE.violin, vibratoCents: 20 }],
];
console.log('\nSTRESS TESTİ — 6 fərqli küy toxumu x 13 nota = 78 ölçmə\n');
console.log('senari'.padEnd(30) + 'düzgün'.padStart(8) + 'ən pis sapma'.padStart(15) + 'oktav səhvi'.padStart(14));
console.log('-'.repeat(67));
for (const [name, o] of cases) {
  const r = trial(o);
  console.log(name.padEnd(30) + (r.pct+'%').padStart(8) + (r.worst+' sent').padStart(15) + String(r.oct).padStart(14));
}
