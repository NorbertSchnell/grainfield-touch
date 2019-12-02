import * as soundworks from 'soundworks/client';

class Renderer extends soundworks.Canvas2dRenderer {
  constructor() {
    super();

    this.buffer = null;
    this.windowPosition = 0.5;
    this.windowY = 0.5;
    this.windowSize = 0;
    this.windowVar = 0;
    this.windowOpacity = 0.5;

    const waveCvs = [null, null];
    waveCvs[0] = document.getElementById('wave-cvs-a');
    waveCvs[1] = document.getElementById('wave-cvs-b');
    waveCvs[0].width = waveCvs[1].width = this.canvasWidth;
    waveCvs[0].height = waveCvs[1].height = this.canvasHeight;

    this.windCvs = document.getElementById('wind-cvs');
    this.waveCvs = waveCvs;

    this.waveToggle = false;
    this.waveUpdate = false;
    this.windUpdate = false;
  }

  setBuffer(buffer, fadeTime = 2) {
    let index = 0 + this.waveToggle;
    let waveCvs = this.waveCvs[index];
    const windCvs = this.windCvs;

    if (this.buffer === null) {
      windCvs.style.transitionProperty = 'opacity';
      windCvs.style.transitionDuration = `${fadeTime + 1}s`;
      windCvs.style.opacity = 1;
    } else if (buffer === null) {
      windCvs.style.transitionProperty = 'opacity';
      windCvs.style.transitionDuration = `${fadeTime + 1}s`;
      windCvs.style.opacity = 0;
    }

    this.buffer = buffer;

    waveCvs.style.transitionProperty = 'opacity';
    waveCvs.style.transitionDuration = `${fadeTime + 1}s`;
    waveCvs.style.opacity = 0;

    this.waveToggle = !this.waveToggle;
    index = 0 + this.waveToggle;
    waveCvs = this.waveCvs[index];

    waveCvs.style.transitionProperty = 'opacity';
    waveCvs.style.transitionDuration = `${fadeTime + 1}s`;
    waveCvs.style.opacity = 1;

    this.waveUpdate = true;
  }

  resetBuffer(fadeTime = 2) {
    this.setBuffer(null, fadeTime);
  }

  setWindowSize(value) {
    this.windowSize = value;
    this.windUpdate = true;
  }

  setWindowPosition(position, y) {
    this.windowPosition = position;
    this.windowY = y;
    this.windUpdate = true;
  }

  setWindowOpacity(value) {
    this.windowOpacity = value;
    this.windUpdate = true;
  }

  renderWaveform(ctx) {
    const buffer = this.buffer;
    const width = this.canvasWidth;
    const height = this.canvasHeight;

    this.waveUpdate = false;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    if (buffer) {
      const waveform = buffer.getChannelData(0);
      const samplesPerPixel = waveform.length / width;
      const center = 0.5 * height;
      const fullamp = 0.25 * height;
      let fEnd = 0;
      let start = 0;

      ctx.strokeStyle = '#fff';
      ctx.globalAlpha = 0.666;

      ctx.beginPath();

      for (let i = 0; i < width; i++) {
        let min = Infinity;
        let max = -Infinity;

        fEnd += samplesPerPixel;
        let end = Math.floor(fEnd + 0.5);

        for (let j = start; j < end; j++) {
          const value = waveform[j];
          min = Math.min(min, value);
          max = Math.max(max, value);
        }

        ctx.moveTo(i, center - fullamp * max);
        ctx.lineTo(i, center - fullamp * min + 0.5);

        start = end;
      }

      ctx.stroke();
    }

    ctx.restore();
  }

  renderWindow(ctx) {
    const buffer = this.buffer;

    if (buffer) {
      const waveform = buffer.getChannelData(0);
      const width = this.canvasWidth;
      const height = this.canvasHeight;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      const samplesPerPixel = waveform.length / width;
      const x = this.windowPosition / samplesPerPixel;
      const y = this.windowY * height - 50;
      const windWidth = this.windowSize / samplesPerPixel;
      const halfWind = 0.5 * windWidth;
      const opacity = this.windowOpacity;

      this.windUpdate = false;

      // const gradient = ctx.createLinearGradient(x - halfWind, 0, x + halfWind, 0);
      // gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      // gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.707)');
      // gradient.addColorStop(0.5, 'rgba(255, 255, 255, 1');
      // gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.707');
      // gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      // ctx.fillStyle = gradient;
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.5 * opacity;

      ctx.fillRect(x - halfWind, 0, windWidth, height);
      ctx.restore();
    }
  }

  resize() {
    this.waveCvs[0].width = this.waveCvs[1].width = this.canvasWidth;
    this.waveCvs[0].height = this.waveCvs[1].height = this.canvasHeight;
    this.waveUpdate = true;
    this.windUpdate = true;
  }

  render(ctx) {
    if (this.waveUpdate) {
      const index = 0 + this.waveToggle;
      const ctx = this.waveCvs[index].getContext('2d');
      this.renderWaveform(ctx);
    }

    if (this.windUpdate)
      this.renderWindow(ctx);
  }
}

export default Renderer;