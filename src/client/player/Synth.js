import { audio, audioContext } from 'soundworks/client';

/**
 * Populate a mono `AudioBuffer` with random values and returns it.
 * @return {AudioBuffer}
 */
function createWhiteNoiseBuffer() {
  const sampleRate = audioContext.sampleRate;
  const bufferSize = 2 * sampleRate; // 2 sec
  const buffer = audioContext.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);

  for (var i = 0; i < bufferSize; i++)
    data[i] = Math.random() * 2 - 1;

  return buffer;
}

class FadingGranularEngine extends audio.GranularEngine {
  constructor() {
    super();

    this.periodRel = 0;
    this.durationRel = 0;

    this.gain = 0;

    this.targetGain = 0;
    this.gainIncr = 0;
  }

  advanceTime(time) {
    const targetGain = this.targetGain;
    let gainIncr = this.gainIncr;
    let gain = this.gain + gainIncr;

    if ((gainIncr > 0 && gain > targetGain) || (gainIncr < 0 && gain < targetGain)) {
      gain = targetGain;
      gainIncr = 0;
    }

    this.gain = gain;

    if (gain > 0)
      return super.advanceTime(time);

    return undefined;
  }

  fade(target, duration) {
    this.gainIncr = (target - this.gain) / (duration / this.periodAbs);
    this.targetGain = target;
  }

  fadeIn(duration) {
     this.fade(1, duration);
  }

  fadeOut(duration) {
     this.fade(0, duration);
  }
}

/**
 * Simple synthesizer producing white noise.
 */
class Synth {
  constructor() {
    this.output = audioContext.createGain();
    this.output.connect(audioContext.destination);

    this.minCutoffFreq = 20;
    this.maxCutoffFreq = 0.5 * audioContext.sampleRate;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);

    this.cutoff = audioContext.createBiquadFilter();
    this.cutoff.connect(this.output);
    this.cutoff.type = 'lowpass';
    this.cutoff.frequency.value = this.maxCutoffFreq;
    this.cutoff.Q.value = 0;

    this.scheduler = audio.getScheduler();

    this.engines = [];

    for (let index = 0; index < 2; index++) {
      const engine = new FadingGranularEngine();
      engine.connect(this.cutoff);
      this.engines[index] = engine;
    }

    this.currentIndex = 0;
    this.isPlaying = false;
    this.currentPosition = Math.random();

    this.setBuffer = this.setBuffer.bind(this);
  }

  start() {
    this.isPlaying = true;
  }

  stop(fadeTime = 2) {
    const engine = this.engines[this.currentIndex];
    engine.fadeOut(fadeTime);

    this.isPlaying = false;
  }

  // cross fade between currentEngine and next engine when new buffer
  setBuffer(buffer, fadeTime = 2) {
    const prevIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % 2;

    const prevEngine = this.engines[prevIndex];
    const nextEngine = this.engines[this.currentIndex];

    prevEngine.fadeOut(fadeTime);

    nextEngine.buffer = buffer;
    nextEngine.fadeIn(fadeTime);

    if (!this.scheduler.has(nextEngine)) {
      this.scheduler.add(nextEngine);
      nextEngine.position = 0.5 * buffer.duration;
    } else {
      nextEngine.position = prevEngine.position;
    }
  }

  setCutoff(factor) {
    this.cutoff.frequency.value = this.minCutoffFreq * Math.exp(this.logCutoffRatio * factor);
  }

  setPosition(position) {
    const engine = this.engines[this.currentIndex];
    const buffer = engine.buffer;

    if (buffer)
      engine.position = position;
  }

  setResamplingVar(resamplingVar) {
    this.engines.forEach((engine) => engine.resamplingVar = resamplingVar);
  }

  setPeriod(value) {
    this.engines.forEach((engine) => engine.periodAbs = value);
  }

  setDuration(value) {
    this.engines.forEach((engine) => engine.durationAbs = value);
  }

  setPositionVar(value) {
    this.engines.forEach((engine) => engine.positionVar = value);
  }

  setGain(value) {
    this.output.gain.value = value;
  }
}

export default Synth;
