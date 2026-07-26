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
    if (this.audioContext && this.audioContext.state !== 'closed') {
      return;
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
    if (!this.isActive || !this.analyser) return;

    requestAnimationFrame(() => {
      const data = this.dataBuffer;
      this.analyser.getFloatTimeDomainData(data);

      // DEBUG: every frame log first few values and check for non-zero
      const hasNonZero = data.some(v => v !== 0);
      const sumAbs = data.reduce((acc, v) => acc + Math.abs(v), 0);
      const avgAbs = sumAbs / data.length;
      this._debugFrame++;
      if (this._debugFrame % 30 === 0) {
        console.log('[PitchDetector] frame', this._debugFrame,
          '| bufferLength:', data.length,
          '| hasNonZero:', hasNonZero,
          '| avg|v|:', avgAbs.toFixed(6),
          '| first5:', data.slice(0,5).map(v=>v.toFixed(3)));
      }

      const result = this.correlate(data, this.audioContext.sampleRate);
      this.processFrequencyData(result);

      // Schedule next autocorrelation step
      this.autoCorrelate();
    });
  }

  /*
   * Robust auto-correlation pitch detection algorithm with improvements:
   * 1. RMS normalization for consistent amplitude handling
   * 2. Spectral trimming to remove silent outliers
   * 3. Correlation for known glottal closure periods using autocorrelation
   * 4. Parabolic interpolation for sub-sample frequency accuracy
   * 5. Confidence calculation based on signal-to-noise ratio
   */
  correlate(buf, sampleRate) {
    const SIZE = buf.length;

    // Step 1: Compute RMS with proper normalization
    let rmsSquared = 0;
    for (let i = 0; i < SIZE; i++) rmsSquared += buf[i] * buf[i];
    const rms = Math.sqrt(rmsSquared / SIZE);

    // Early exit if signal is too quiet
    if (rms < this.minRMSThreshold) {
      return { frequency: 0, confidence: 0 };
    }

    // Step 2: Normalize the buffer to unit RMS for correlation
    const normalizedBuf = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) {
      normalizedBuf[i] = buf[i] / rms;
    }

    // Step 3: Trim silent regions at start and end
    const thres = 0.2;
    let start = 0, end = SIZE - 1;

    // Find start of active signal
    for (start = 0; start < SIZE / 2; start++) {
      if (Math.abs(normalizedBuf[start]) >= thres) break;
    }

    // Find end of active signal
    for (end = SIZE - 1; end > SIZE / 2; end--) {
      if (Math.abs(normalizedBuf[end]) >= thres) break;
    }

    // Ensure minimum buffer length
    const minBufferLen = 8;
    if (end - start < minBufferLen) {
      return { frequency: 0, confidence: 0 };
    }

    const trimmed = normalizedBuf.slice(start, end + 1);
    const n = trimmed.length;

    // Step 4: Compute normalized auto-correlation
    const correlation = new Float32Array(n);
    let cMax = 0;

    for (let lag = 0; lag < n; lag++) {
      let sum = 0;
      // Optimized correlation calculation
      for (let i = 0; i < n - lag; i++) {
        sum += trimmed[i] * trimmed[i + lag];
      }
      // Normalize correlation
      correlation[lag] = sum / (n - lag);

      // Track maximum correlation
      if (correlation[lag] > cMax) cMax = correlation[lag];
    }

    // If max correlation is negligible, signal is too noisy
    if (cMax < 0.1) {
      return { frequency: 0, confidence: 0 };
    }

    // Step 5: Skip initial decline (classic YIN principle)
    let d = 0;
    while (d < n - 1 && correlation[d] > correlation[d + 1]) d++;

    // Find first peak after the initial decline
    let peakIndex = -1;
    let peakValue = -1;
    for (let i = d; i < n - 1; i++) {
      if (correlation[i] > peakValue) {
        peakValue = correlation[i];
        peakIndex = i;
        // Stop at first local maximum (first peak = fundamental period)
        if (i + 1 < n && correlation[i] > correlation[i + 1]) {
          break;
        }
      }
    }

    if (peakIndex <= 0) {
      return { frequency: 0, confidence: 0 };
    }

    // Step 6: Parabolic interpolation for sub-sample precision
    let preciseIndex = peakIndex;
    if (peakIndex > 0 && peakIndex < n - 1) {
      const x1 = correlation[peakIndex - 1];
      const x2 = correlation[peakIndex];
      const x3 = correlation[peakIndex + 1];

      // Parabolic coefficients
      const a = (x1 + x3 - 2 * x2) / 2;
      const b = (x3 - x1) / 2;

      // Calculate vertex of parabola for fractional index
      if (Math.abs(a) > 1e-10) {
        preciseIndex = peakIndex - b / (2 * a);
      }
    }

    // Step 7: Calculate frequency from precise index
    // Convert lag to period, then to frequency
    const precisePeriod = preciseIndex / sampleRate;
    const freq = 1.0 / precisePeriod;

    // Validate frequency range (adjustable based on application)
    const minFreq = 50;
    const maxFreq = 2000;
    if (freq < minFreq || freq > maxFreq) {
      return { frequency: 0, confidence: 0 };
    }

    // Step 8: Calculate confidence as normalized correlation strength
    // Normalize by maximum possible correlation (signal energy at lag 0)
    const maxPossibleCorrelation = 1.0; // Since we're normalized
    const confidence = Math.max(0, Math.min(100, (peakValue / maxPossibleCorrelation) * 100));

    return { frequency: freq, confidence: confidence };
  }

  processFrequencyData(result) {
    const { frequency, confidence } = result;

    if (!frequency || frequency < this.minFrequency || frequency > this.maxFrequency) {
      this.silentFrames++;
      if (this.silentFrames >= 3) {
        this.hysteresis = 0;
        this.currentFreq = 0;
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

  getReading() {
    const freq = this.currentFreq || this.lastValidFreq || 0;

    return {
      frequency: freq,
      midiNote: freq ? Math.round(freqToMidi(freq)) : null,
      confidence: this.confidence,
      timestamp: Date.now()
    };
  }

  stop() {
    this.isActive = false;

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
  }
}

function freqToMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}