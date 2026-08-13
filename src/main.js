import '../style.css';

import { NOTES, TOLERANCE_SEMITONES } from './audio/constants.js';
import { PitchDetector } from './audio/PitchDetector.js';
import { NoteMatcher } from './audio/NoteMatcher.js';
import { Bird } from './game/Bird.js';
import { Pipe } from './game/Pipe.js';
import { CollisionSystem } from './game/CollisionSystem.js';
import { Renderer } from './render/Renderer.js';
import { HUD } from './ui/HUD.js';

/* ------------------------------------------------------------------ *
 *  Pitchy Bird — giriş nöqtəsi (entry point)
 *  Bütün modulları burada qoşuruq və əsas oyun döngüsünü idarə edirik.
 * ------------------------------------------------------------------ */

const W = 720;
const H = 480;

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas, { width: W, height: H });
const hud = new HUD();

const noteMatcher = new NoteMatcher(NOTES, TOLERANCE_SEMITONES);
const pitchDetector = new PitchDetector();
const bird = new Bird({ width: W, height: H });
const pipe = new Pipe(NOTES, { width: W, height: H });
const collision = new CollisionSystem(noteMatcher, TOLERANCE_SEMITONES);

let running = false;
let lastTimestamp = 0;
let score = 0;

/* Mikrofonu başlat. Uğurlu olub-olmadığını qaytarır — çağıran tərəf
   bu nəticəyə görə qərar verməlidir (M0 / A2). */
async function initAudio() {
  try {
    await pitchDetector.start();
    hud.setMicStatus('');
    return true;
  } catch (err) {
    hud.setMicStatus(micErrorMessage(err));
    return false;
  }
}

/* Brauzerin verdiyi xəta adını istifadəçinin başa düşəcəyi mesaja çevir */
function micErrorMessage(err) {
  switch (err && err.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Mikrofon icazəsi verilmədi. Brauzerin ünvan sətrindəki mikrofon nişanından icazə verib yenidən cəhd et.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Mikrofon tapılmadı. Cihazına mikrofon qoşulduğuna əmin ol.';
    case 'NotReadableError':
      return 'Mikrofona başqa proqram müdaxilə edir. Digər proqramları bağlayıb yenidən cəhd et.';
    default:
      return 'Mikrofon açıla bilmədi: ' + ((err && err.message) || 'naməlum xəta');
  }
}

/* Oyunu sıfırla və başlat */
function startGame() {
  hud.hideOverlays();
  bird.reset();
  pipe.reset();
  collision.reset();
  score = 0;
  hud.setScore(score);
  running = true;
  lastTimestamp = 0;
  requestAnimationFrame(gameLoop);
}

function endGame() {
  running = false;
  /* Mikrofonu burax — oyun bitəndən sonra brauzerin qeyd nişanı
     yanıb qalmamalıdır (M0). Retry yeni user gesture-dir, yenidən açılır. */
  pitchDetector.stop();
  hud.showGameOver(score);
}

/* Əsas döngü — delta-time əsaslı */
function gameLoop(timestamp) {
  if (!running) return;

  const deltaMs = lastTimestamp ? timestamp - lastTimestamp : 16.7;
  lastTimestamp = timestamp;

  const reading = pitchDetector.getReading() || {};
  reading.frequency = reading.frequency || 0;
  bird.update(deltaMs, reading);
  pipe.update(deltaMs);

  /* CollisionSystem-i faktiki olaraq çağırırıq:
     quşun son tutulan notası ilə borunun tələb etdiyi notası
     arasındakı semitone fərqini tolerantlıq həddi ilə müqayisə edir. */
  const result = collision.evaluate(bird, pipe);

  if (result.collided) {
    endGame();
    return;
  }
  if (result.passedPipe) {
    score++;
    hud.setScore(score);
    pipe.increaseDifficulty();
  }

  /* Debug overlay üçün məlumatları HUD-a ötürürük */
  hud.updateDebug({
    rawFrequency: reading ? reading.frequency : null,
    filteredFrequency: bird.getFilteredFrequency(),
    detectedNote: reading ? reading.midiNote : null,
    requiredNote: pipe.getCurrentRequiredNote(),
    semitoneDiff: collision.getLastSemitoneDiff()
  });

  renderer.render({
    bird,
    pipes: pipe.list,
    reading,
    requiredNote: pipe.getCurrentRequiredNote()
  });

  requestAnimationFrame(gameLoop);
}

/* UI hadisələri */
let starting = false;

async function handleStartRequest(button) {
  if (starting || running) return;   // ikiqat klik → iki paralel loop yaradırdı
  starting = true;
  if (button) button.disabled = true;

  try {
    hud.setMicStatus('Mikrofon icazəsi gözlənilir...');
    const micReady = await initAudio();

    /* Mikrofon açılmadısa oyunu BAŞLATMIRIQ. Əvvəl xəta udulur və oyun
       yenə də başlayırdı — istifadəçi 2 saniyəyə ölür və səbəbini görmürdü. */
    if (!micReady) {
      hud.showStartOverlay();
      return;
    }

    startGame();
  } finally {
    starting = false;
    if (button) button.disabled = false;
  }
}

document.getElementById('startBtn').addEventListener('click', (e) => {
  handleStartRequest(e.currentTarget);
});

document.getElementById('retryBtn').addEventListener('click', (e) => {
  handleStartRequest(e.currentTarget);
});

/* Səhifə bağlananda/gizlənəndə mikrofonu mütləq burax */
window.addEventListener('pagehide', () => {
  running = false;
  pitchDetector.stop();
});

/* İlk statik çəkiliş */
renderer.renderStatic(NOTES);