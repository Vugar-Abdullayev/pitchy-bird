import { NOTES } from '../audio/constants.js';

export class PitchDetector {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.buffers = [];
    this.maxBuffers = 4;
    this.minConfidence = 10;

    this.currentFreq = 0;
    this.lastValidFreq = 0;
    this.confidence = 0;
    this.hysteresis = 0;
    this.silentFrames = 0;
    this.lastStrongFreq = 0;

    this.smoothingFactor = 0.4;

    this.octaveRatioMin = 0.45;
    this.octaveRatioMax = 2.2;
    this.invOctaveRatioMax = 1 / this.octaveRatioMin;

    this._rafId = null;
    this.debugLog = true;   // müvəqqəti — M1-də normal göstərici ilə əvəz olunur

    /* Alqoritmin fiziki iş diapazonu — oyunun nota diapazonu ilə eyni deyil.
       Geniş saxlayırıq ki, diapazon kənarına düşən səsi də TAPA bilək və
       sonra "sən bemol çalırsan" deyə bilək. */
    this.absMinFreq = 80;
    this.absMaxFreq = 1200;

    /* Siqnalın periodik sayılması üçün minimum NSDF gücü */
    this.nsdfThreshold = 0.5;

    /* Təpə seçimi: ən güclünün bu nisbətini keçən ilk təpə seçilir */
    this.peakPickRatio = 0.9;

    this.minFrequency = 196;
    this.maxFrequency = 659;

    // Energy/volume thresholds for voice detection
    this.minRMSThreshold = 0.005;       // Minimum RMS energy to consider signal (was 0.01, lowered for sensitivity)
    this.minConfidence = 10;             // Minimum autocorrelation confidence
    this.minEnergyRatio = 0.15;          // Minimum energy ratio (signal vs noise floor)

    this.isActive = false;

    // DEBUG: müvəqqəti frame sayğacı (diaqnostika üçün)
    this._debugFrame = 0;
  }

  async start() {
    /* Artıq işləyirsə yenidən qurma — ikiqat start qorunması (M0). */
    if (this.isActive) {
      return true;
    }

    if (!window.AudioContext && !window.webkitAudioContext) {
      throw new Error(' AudioContext not supported in this browser');
    }

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      // DEBUG (a): getUserMedia uğurlu oldu
      console.log('[PitchDetector] getUserMedia OK — sampleRate:', this.audioContext.sampleRate, 'tracks:', this.stream.getAudioTracks().map(t => t.label));
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();

      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0;  // Disable smoothing for time-domain analysis
      this.analyser.minDecibels = -100;
      this.analyser.maxDecibels = -30;

      this.source.connect(this.analyser);

      // Time-domain buffer — fftSize ölçüsünde olmalıdır,
      // çünki getFloatTimeDomainData() fftSize elementlə doldurur.
      this.dataBuffer = new Float32Array(this.analyser.fftSize);

      this.buffers = [];
      this.currentFreq = 0;
      this.lastValidFreq = 0;
      this.confidence = 0;
      this.hysteresis = 0;
      this.silentFrames = 0;
      this.lastStrongFreq = 0;

      this.isActive = true;

      this.autoCorrelate();
      return this.isActive;
    } catch (error) {
      console.error(' Failed to initialize microphone:', error);
      this.isActive = false;
      throw error;
    }
  }

  autoCorrelate() {
    if (!this.isActive) return;

    this._rafId = requestAnimationFrame(() => {
      /* Qorunma məhz BURADA olmalıdır, planlamadan əvvəl yox.
         stop() çağırılanda növbədə artıq bir kadr qalır; o kadr işə düşəndə
         analyser artıq null-dur. Əvvəl bu kadr köhnə (disconnect edilmiş)
         obyektə toxunurdu və səssizcə keçirdi — M0-da referanslar null
         edildikdən sonra TypeError kimi üzə çıxdı. */
      if (!this.isActive || !this.analyser || !this.audioContext) return;

      const data = this.dataBuffer;
      this.analyser.getFloatTimeDomainData(data);

      let sumAbs = 0;
      for (let i = 0; i < data.length; i++) sumAbs += Math.abs(data[i]);
      const level = sumAbs / data.length;

      const result = this.correlate(data, this.audioContext.sampleRate);
      this.processFrequencyData(result);

      /* Müvəqqəti diaqnostika. Bir sətirdə bütün zəncir görünür:
         mikrofon → alqoritm → diapazon süzgəci → oyuna gedən dəyər. */
      this._debugFrame++;
      if (this.debugLog && this._debugFrame % 30 === 0) {
        const f = result.frequency;
        const inRange = f >= this.minFrequency && f <= this.maxFrequency;
        console.log(
          '[Pitch] səviyyə:', level.toFixed(4),
          '| tapıldı:', f ? f.toFixed(1) + ' Hz' : 'YOX',
          '| güvən:', Math.round(result.confidence),
          '| diapazon:', !f ? '—' : (inRange ? 'OK' : 'ATILDI (' + this.minFrequency + '-' + this.maxFrequency + ' Hz kənarı)'),
          '| oyuna gedən:', this.currentFreq ? this.currentFreq.toFixed(1) + ' Hz' : '0'
        );
      }

      this.autoCorrelate();
    });
  }

  /*
   * Tezlik tapma — McLeod Pitch Method (MPM).
   *
   * Köhnə üsul "ilk enişi keç, sonra rast gəldiyin ilk təpəni götür"
   * deyirdi. Bu iki halda dağılırdı:
   *   - küy kiçik saxta təpə yaradırdı → tamamilə səhv rəqəm
   *   - əsas ton zəif olanda üst tonun təpəsi əvvəl gəlirdi → 2x/3x səhv
   *
   * MPM üç şeyi dəyişir:
   *   1. NSDF — nəticəni [-1, 1] aralığına normallaşdırır. Uzaq lag-larda
   *      qiymət sönmür, ona görə müqayisə ədalətli olur.
   *   2. Yalnız "açar təpələr" — sıfır keçidləri arasındakı ən yüksək nöqtə.
   *      Küyün yaratdığı xırda dalğalanmalar avtomatik kənarda qalır.
   *   3. Ən güclü təpənin 90%-ni keçən İLK təpəni seçir. Üst ton həmişə
   *      əsas tondan SONRA gəldiyi üçün əsas ton qalib gəlir.
   */
  correlate(buf, sampleRate) {
    const SIZE = buf.length;

    let rmsSquared = 0;
    for (let i = 0; i < SIZE; i++) rmsSquared += buf[i] * buf[i];
    const rms = Math.sqrt(rmsSquared / SIZE);

    if (rms < this.minRMSThreshold) {
      return { frequency: 0, confidence: 0 };
    }

    /* DC sürüşməsini çıxar — bəzi mikrofonlarda sabit ofset olur */
    let mean = 0;
    for (let i = 0; i < SIZE; i++) mean += buf[i];
    mean /= SIZE;

    const minLag = Math.max(2, Math.floor(sampleRate / this.absMaxFreq));
    const maxLag = Math.min(SIZE - 1, Math.ceil(sampleRate / this.absMinFreq));
    if (maxLag <= minLag + 2) {
      return { frequency: 0, confidence: 0 };
    }

    /* NSDF: 2·r(τ) / m(τ). Nəticə [-1, 1] aralığındadır və
       1.0 = tam təkrarlanma deməkdir. */
    const nsdf = new Float32Array(maxLag + 1);
    for (let lag = 0; lag <= maxLag; lag++) {
      let acf = 0;
      let energy = 0;
      const limit = SIZE - lag;
      for (let i = 0; i < limit; i++) {
        const a = buf[i] - mean;
        const b = buf[i + lag] - mean;
        acf += a * b;
        energy += a * a + b * b;
      }
      nsdf[lag] = energy > 0 ? (2 * acf) / energy : 0;
    }

    /* Açar təpələr: hər müsbət bölgədə yalnız ən yüksək nöqtə.
       Əvvəlcə lag=0-dakı təpəni keçirik (o həmişə 1.0-dır). */
    const keyMaxima = [];
    let lag = 0;
    while (lag <= maxLag && nsdf[lag] > 0) lag++;

    while (lag <= maxLag) {
      while (lag <= maxLag && nsdf[lag] <= 0) lag++;
      if (lag > maxLag) break;

      let bestLag = lag;
      let bestVal = nsdf[lag];
      while (lag <= maxLag && nsdf[lag] > 0) {
        if (nsdf[lag] > bestVal) {
          bestVal = nsdf[lag];
          bestLag = lag;
        }
        lag++;
      }
      if (bestLag >= minLag) keyMaxima.push(bestLag);
    }

    if (keyMaxima.length === 0) {
      return { frequency: 0, confidence: 0 };
    }

    let globalMax = 0;
    for (const k of keyMaxima) {
      if (nsdf[k] > globalMax) globalMax = nsdf[k];
    }

    /* Ən güclü təpə belə zəifdirsə, siqnal periodik deyil (küy, nəfəs, otaq) */
    if (globalMax < this.nsdfThreshold) {
      return { frequency: 0, confidence: 0 };
    }

    /* HƏLLEDİCİ ADDIM: ən güclünün 90%-ni keçən İLK təpə.
       Üst tonlar həmişə daha böyük lag-da (yəni sonra) olduğu üçün
       bu seçim əsas tonu üstün tutur. */
    const cutoff = globalMax * this.peakPickRatio;
    let chosen = keyMaxima[keyMaxima.length - 1];
    for (const k of keyMaxima) {
      if (nsdf[k] >= cutoff) {
        chosen = k;
        break;
      }
    }

    /* Parabolik interpolyasiya — nümunələr arası dəqiqlik üçün */
    let preciseLag = chosen;
    if (chosen > 0 && chosen < maxLag) {
      const x1 = nsdf[chosen - 1];
      const x2 = nsdf[chosen];
      const x3 = nsdf[chosen + 1];
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;
      if (Math.abs(a) > 1e-12) {
        const shift = -b / (2 * a);
        if (Math.abs(shift) < 1) preciseLag = chosen + shift;
      }
    }

    if (preciseLag <= 0) {
      return { frequency: 0, confidence: 0 };
    }

    const freq = sampleRate / preciseLag;
    if (freq < this.absMinFreq || freq > this.absMaxFreq) {
      return { frequency: 0, confidence: 0 };
    }

    const confidence = Math.max(0, Math.min(100, nsdf[chosen] * 100));
    return { frequency: freq, confidence: confidence };
  }

  processFrequencyData(result) {
    const { frequency, confidence } = result;

    if (!frequency || frequency < this.minFrequency || frequency > this.maxFrequency) {
      this.silentFrames++;
      if (this.silentFrames >= 3) {
        this.hysteresis = 0;
        this.currentFreq = 0;
        this.confidence = 0;
        /* Oktav-sıçrayış referansını da sıfırlayırıq: fasilədən sonra gələn
           ilk nota köhnə notaya görə "sıçrayış" sayılmamalıdır. */
        this.lastStrongFreq = 0;
      }
      return;
    }

    this.silentFrames = 0;

    const ratio = frequency / (this.lastStrongFreq || 1);
    const invRatio = 1 / ratio;

    const isOctaveJump = this.lastStrongFreq > 0 && (
      ratio > this.octaveRatioMax ||
      ratio < this.octaveRatioMin ||
      invRatio > this.invOctaveRatioMax
    );

    if (confidence > this.minConfidence && !isOctaveJump) {
      this.hysteresis = Math.max(0, this.hysteresis - 1);

      if (this.hysteresis === 0) {
        this.lastStrongFreq = frequency;
        this.currentFreq = this.currentFreq ? this.smoothingFactor * frequency + (1 - this.smoothingFactor) * this.currentFreq : frequency;
        this.confidence = confidence;
        this.lastValidFreq = frequency;
      }
    } else {
      this.hysteresis = Math.min(5, this.hysteresis + 1);
    }
  }

  /* Cari oxunuş. Səs yoxdursa frequency = 0 qaytarır.
     DİQQƏT: burada lastValidFreq-ə fallback etmək olmaz. Əvvəl belə idi və
     buna görə sükut heç vaxt oyuna çatmırdı (M0 / A1). */
  getReading() {
    const freq = this.currentFreq || 0;
    const hasSignal = freq > 0;

    return {
      frequency: freq,
      midiNote: hasSignal ? Math.round(freqToMidi(freq)) : null,
      confidence: hasSignal ? this.confidence : 0,
      hasSignal: hasSignal,
      timestamp: Date.now()
    };
  }

  stop() {
    this.isActive = false;

    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    if (this.source) {
      this.source.disconnect();
    }
    if (this.analyser) {
      this.analyser.disconnect();
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }

    /* Referansları təmizlə — əks halda start() ikinci dəfə düzgün işləmir. */
    this.source = null;
    this.analyser = null;
    this.stream = null;
    this.audioContext = null;
    this.dataBuffer = null;

    this.currentFreq = 0;
    this.lastValidFreq = 0;
    this.confidence = 0;
    this.hysteresis = 0;
    this.silentFrames = 0;
    this.lastStrongFreq = 0;
  }
}

function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}