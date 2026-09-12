/**
 * RACEFORGE Audio Engine (Web Audio API Synthesizer)
 * Realistic synthesized combustion engine tone, turbo spool, tire screeches,
 * collisions, gear-shift backfires, countdown beeps, and UI feedback.
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;

    // Engine sound nodes
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.subOsc = null;

    // Tire screech nodes
    this.screechSource = null;
    this.screechGain = null;
    this.screechFilter = null;

    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSynth();
      this.setupTireScreechSynth();

      this.initialized = true;
      console.log('🔊 [AUDIO] Raceforge Web Audio Synthesizer online.');
    } catch (e) {
      console.warn('Audio Context initialization deferred until user interaction:', e);
    }
  }

  unlock() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSynth() {
    if (!this.ctx) return;

    // Primary combustion engine oscillator
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    // Sub rumble oscillator for low-end bass
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'triangle';
    this.subOsc.frequency.setValueAtTime(22, this.ctx.currentTime);

    // Low-pass filter to shape intake/exhaust harmonics
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    // Waveshaper distortion for exhaust rasp
    this.distortion = this.ctx.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve(20);
    this.distortion.oversample = '4x';

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.subOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.distortion);
    this.distortion.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc.start();
    this.subOsc.start();
  }

  setupTireScreechSynth() {
    if (!this.ctx) return;

    // White noise generator for tire scrub
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.screechFilter = this.ctx.createBiquadFilter();
    this.screechFilter.type = 'bandpass';
    this.screechFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.screechFilter.Q.setValueAtTime(5.0, this.ctx.currentTime);

    this.screechGain = this.ctx.createGain();
    this.screechGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    whiteNoise.connect(this.screechFilter);
    this.screechFilter.connect(this.screechGain);
    this.screechGain.connect(this.masterGain);

    whiteNoise.start();
  }

  updateEngine(rpm, throttle, isRacing) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    if (!isRacing) {
      this.engineGain.gain.setTargetAtTime(0.0, t, 0.05);
      return;
    }

    // Base idle 800 RPM -> ~45Hz, Redline 8500 RPM -> ~380Hz
    const baseFreq = 40 + (rpm / 8500) * 340;
    this.engineOsc.frequency.setTargetAtTime(baseFreq, t, 0.03);
    this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, t, 0.03);

    // Filter opens under heavy throttle
    const filterFreq = 300 + (rpm / 8500) * 1600 + (throttle * 800);
    this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.05);

    // Engine volume scales with throttle + idle baseline
    const targetGain = 0.15 + (throttle * 0.45);
    this.engineGain.gain.setTargetAtTime(targetGain, t, 0.04);
  }

  updateTires(slipRatio) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Screech activates when lateral or longitudinal slip exceeds threshold
    const screechVolume = Math.min(1.0, Math.max(0, (slipRatio - 0.25) * 2.0));
    this.screechGain.gain.setTargetAtTime(screechVolume * 0.35, t, 0.05);
  }

  playGearShift() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Brief throttle drop & exhaust pop
    const popOsc = this.ctx.createOscillator();
    popOsc.type = 'square';
    popOsc.frequency.setValueAtTime(120, t);
    popOsc.frequency.exponentialRampToValueAtTime(30, t + 0.08);

    const popGain = this.ctx.createGain();
    popGain.gain.setValueAtTime(0.4, t);
    popGain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    popOsc.connect(popGain);
    popGain.connect(this.masterGain);

    popOsc.start(t);
    popOsc.stop(t + 0.08);
  }

  playCollision(intensity = 0.5) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.25);

    const gain = this.ctx.createGain();
    const vol = Math.min(0.8, intensity * 0.8);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  playCountdownBeep(isFinal = false) {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isFinal ? 880 : 440, t); // High A for GO

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + (isFinal ? 0.6 : 0.2));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + (isFinal ? 0.6 : 0.2));
  }

  playUiClick() {
    if (!this.initialized || !this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  makeDistortionCurve(amount = 20) {
    const k = typeof amount === 'number' ? amount : 20;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  setMute(muted) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }
}

window.AudioManager = AudioManager;
