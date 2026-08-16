import '../style.css';
import { PitchDetector } from './audio/PitchDetector.js';
import { SCALES, buildScaleNotes, freqToNoteName, midiToFreq, MIDI_G3 } from './audio/scales.js';
import { createPitchMapping } from './game/pitchMapping.js';
import { getLevel, LEVELS, pipeGeometry } from './game/difficulty.js';
import { MelodySource } from './game/MelodySource.js';
import { Bird } from './game/Bird.js';
import { Pipe } from './game/Pipe.js';
import { CollisionSystem } from './game/CollisionSystem.js';
import { Renderer } from './render/Renderer.js';
import { HUD } from './ui/HUD.js';

const canvas = document.getElementById('game');
const pitchDetector = new PitchDetector();
const renderer = new Renderer(canvas);
const collision = new CollisionSystem();
const hud = new HUD();

let mapping, geometry, melody, bird, pipes, notes;
let levelIndex = 0;
let level = getLevel(levelIndex);
let score = 0;
let passesThisLevel = 0;
let running = false;
let lastTimestamp = 0;
let frameId = null;

/* ── Ölçü / tam ekran ─────────────────────────────────────────────
   Canvas artıq sabit 720×480 deyil. Ölçü ekranın özündən gəlir və
   dəyişəndə bütün model yenidən qurulur. Ölçülər sent ilə təyin
   olunduğu üçün oyun böyük ekranda asanlaşmır, kiçikdə çətinləşmir. */
function layout() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(320, Math.round(rect.width));
  const cssH = Math.max(240, Math.round(rect.height));

  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  renderer.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const margin = Math.round(Math.min(28, cssH * 0.05));
  const floorY = cssH - margin;

  /*
   * ZƏMİN BANDI — ən pes notanın altındakı boşluq.
   *
   * Nə üçün lazımdır: susan quş buraya düşür və ən pes notanın
   * borusunun GÖVDƏSİNƏ dəyir. Yəni cəzanı zəmin yox, boru verir.
   *
   * Nə üçün hesablanır: əvvəl ekranın 10%-i kimi təxmin etmişdim —
   * həddindən artıq geniş idi, nota sahəsini yuxarı sıxırdı və altda
   * boş sahə qalırdı. İndi lazım olan MİNİMUM tapılır:
   *
   *     zəmin_bandı ≥ radius + boşluq/2 + ehtiyat − (G3-ün zonadakı payı)
   *
   * Ölçülər bir-birindən asılı olduğu üçün iki keçidlə həll edirik.
   */
  let ground = Math.round(cssH * 0.05);
  for (let pass = 0; pass < 3; pass++) {
    const m = createPitchMapping({
      playTop: margin,
      playBottom: floorY - ground,
      floorY,
      toleranceCents: level.toleranceCents
    });
    const g = pipeGeometry(level, m);
    const lowestY = m.freqToY(midiToFreq(MIDI_G3)); // ən pes HƏQİQİ nota (G3)
    const need = Math.ceil(
      (lowestY + g.gapBelowPx + g.extentDown + 10) - (floorY - ground)
    );
    const next = Math.max(24, ground + need);
    if (Math.abs(next - ground) < 2) { ground = next; break; }
    ground = next;
  }

  mapping = createPitchMapping({
    playTop: margin,
    playBottom: floorY - ground,
    floorY,
    toleranceCents: level.toleranceCents
  });
  geometry = pipeGeometry(level, mapping);

  const scale = SCALES[level.scaleId];
  notes = buildScaleNotes(scale).filter(n => mapping.isVisible(n.freq));

  const birdX = Math.round(cssW * 0.22);

  if (!melody) melody = new MelodySource(notes, level);
  else melody.setNotes(notes, level);

  if (!bird) bird = new Bird({ mapping, geometry, birdX });
  else bird.configure({ mapping, geometry, birdX });

  if (!pipes) pipes = new Pipe({ mapping, level, geometry, melody, width: cssW });
  else pipes.configure({ mapping, level, geometry, melody, width: cssW });

  renderer.configure({ mapping, geometry, notes, width: cssW, height: cssH, birdX });

  if (!running) renderer.render({ bird, pipes, reading: null });
}

function applyLevel(index) {
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
  level = getLevel(levelIndex);
  passesThisLevel = 0;
  layout();
  hud.setLevel(level);
}

/* ── Oyun döngüsü ─────────────────────────────────────────────── */
function gameLoop(timestamp) {
  if (!running) return;

  if (!lastTimestamp) lastTimestamp = timestamp;
  /* Sekmə dəyişəndə deltaMs yüzlərlə ms ola bilir — quş teleport edir */
  const deltaMs = Math.min(50, timestamp - lastTimestamp);
  lastTimestamp = timestamp;

  const reading = pitchDetector.getReading();

  bird.update(deltaMs, reading);
  pipes.update(deltaMs);

  const result = collision.evaluate(bird, pipes, mapping);

  if (result.passedPipe) {
    score++;
    passesThisLevel++;
    hud.setScore(score);
    if (passesThisLevel >= level.passesToAdvance && levelIndex < LEVELS.length - 1) {
      applyLevel(levelIndex + 1);
    }
  }

  const required = pipes.getCurrentRequiredNote();
  hud.updateDebug({
    frequency: bird.filteredFreq,
    noteName: freqToNoteName(bird.filteredFreq),
    targetName: required ? required.name : null,
    errorCents: (bird.filteredFreq && required)
      ? 1200 * Math.log2(bird.filteredFreq / required.freq)
      : null
  });

  renderer.render({ bird, pipes, reading });

  if (result.collided) {
    endGame();
    return;
  }
  frameId = requestAnimationFrame(gameLoop);
}

function startGame() {
  applyLevel(0);
  score = 0;
  running = true;
  lastTimestamp = 0;
  bird.reset();
  pipes.reset();
  collision.reset();
  hud.setScore(0);
  hud.hideOverlays();
  frameId = requestAnimationFrame(gameLoop);
}

function endGame() {
  running = false;
  if (frameId) cancelAnimationFrame(frameId);
  pitchDetector.stop();
  hud.showGameOver(score);
}

/* ── Mikrofon ─────────────────────────────────────────────────── */
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

/* ── UI ───────────────────────────────────────────────────────── */
let starting = false;

async function handleStartRequest(button) {
  if (starting || running) return;
  starting = true;
  if (button) button.disabled = true;
  try {
    hud.setMicStatus('Mikrofon icazəsi gözlənilir...');
    const micReady = await initAudio();
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

document.getElementById('startBtn').addEventListener('click', e => handleStartRequest(e.currentTarget));
document.getElementById('retryBtn').addEventListener('click', e => handleStartRequest(e.currentTarget));

window.addEventListener('pagehide', () => {
  running = false;
  pitchDetector.stop();
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(layout, 120);
});

layout();