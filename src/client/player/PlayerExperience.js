import * as soundworks from 'soundworks/client';
import Synth from './Synth';
import Renderer from './Renderer';
import PitchAndRollEstimator from './PitchAndRollEstimator.js';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

const fadeTime = 2;
const releaseTime = 8;

function dBToLin(val) {
  return Math.exp(0.11512925464970229 * val); // pow(10, val / 20)
}

const colors = [
  '#9e9e9e', // 'light grey'
  '#b30000', // 'red'
  '#b37800', // 'orange'
  '#b3b000', // 'yellow'
  '#3eb300', // 'green'
  '#00b1b3', // 'turquoise'
  '#024fb3', // 'blue'
  '#4b00b3', // 'purple'
  '#b300b3', // 'magenta'
  '#595959', // 'dark grey'
];

const template = `
  <canvas id="wind-cvs" class="wind-canvas background"></canvas>
  <canvas id="wave-cvs-a" class="wave-canvas"></canvas>
  <canvas id="wave-cvs-b" class="wave-canvas"></canvas>
  <div id="foreground" class="foreground">
    <div class="section-top"></div>
    <div class="section-center flex-center">
      <p class="normal">
        <% if (state === 'wait') { %>
          <span class="title">Connected</span><br/>
          Please wait.
        <% } else if (state === 'starting') { %>
          <span class="title">Starting sound</span><br/>
          Hold on...
        <% } else if (state === 'playing') { %>
          <span class="title">Playing</span><br/>
          Move your finger on screen:<br/>
          &#8596; srcub, &#8597; filter cutoff
        <% } else if (state === 'end') { %>
          <span class="title">Thanks,<br/>
          that's all!</span>
        <% } %>
      </p>
    </div>
    <div class="section-bottom">
      <p class="normal">
      </p>
    </div>
  </div>
`;

class PlayerView extends soundworks.CanvasView {
  constructor(template, model, events, options) {
    super(template, model, events, options);
    this.playerRenderer = null;
  }

  setState(state) {
    if (state !== this.model.state) {
      this.model.state = state;
      this.render('.foreground');
    }
  }

  addRenderer(renderer) {
    super.addRenderer(renderer);
    this.playerRenderer = renderer;
  }

  removeRenderer(renderer) {
    super.removeRenderer(renderer);
    super.playerRenderer = null;
  }

  onResize(viewportWidth, viewportHeight, orientation) {
    super.onResize(viewportWidth, viewportHeight, orientation);

    if (this.playerRenderer) {
      this.playerRenderer.resize();
    }
  }

  setBackgroundColor(index, fadeTime) {
    const backgroundColor = colors[index % colors.length];

    this.$el.style.transitionProperty = 'background-color';
    this.$el.style.transitionDuration = `${2 * fadeTime}s`;
    this.$el.style.backgroundColor = backgroundColor;
  }

  resetBackgroundColor(fadeTime) {
    this.$el.style.transitionProperty = 'background-color';
    this.$el.style.transitionDuration = `${2 * fadeTime}s`;
    this.$el.style.backgroundColor = 'transparent';
  }
}

class PlayerExperience extends soundworks.Experience {
  constructor() {
    super();

    this.platform = this.require('platform', { features: 'web-audio' });
    // this.require('locator');
    this.checkin = this.require('checkin');
    this.audioBufferManager = this.require('audio-buffer-manager');
    this.sharedParams = this.require('shared-params');

    this.sharedConfig = this.require('shared-config', {
      items: ['recordings'],
    });

    this.sharedRecorder = this.require('shared-recorder', {
      recorder: false,
    });

    this.bufferDuration = 2;
    this.grainDuration = 0.1;
    this.grainVar = 0.005;
    this.margin = 0;

    this.touchId = null;

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.onBuffer = this.onBuffer.bind(this);
  }

  updateWindow() {
    const minPositionVar = 0.005; // see sharedParam positionVar server/index.js
    const maxDuration = this.bufferDuration - 2 * minPositionVar;
    const grainDuration = Math.min(maxDuration, this.grainDuration);
    const maxPositionVar = 0.5 * (this.bufferDuration - grainDuration);
    const positionVar = Math.min(maxPositionVar, this.grainVar);

    this.synth.setDuration(grainDuration);
    this.synth.setPositionVar(positionVar);

    const windowDuration = grainDuration + 2 * positionVar;
    const windowSize = windowDuration * audioContext.sampleRate;
    this.renderer.setWindowSize(windowSize);

    const margin = 0.5 * windowDuration;
    this.minPosition = margin;
    this.maxPosition = this.bufferDuration - margin;
  }

  start() {
    super.start();

    const recordings = this.sharedConfig.get('recordings');
    this.phase = client.index % recordings.record.num;

    this.synth = new Synth();
    this.pitchAndRoll = new PitchAndRollEstimator();
    this.view = new PlayerView(template, { state: 'none' }, {}, {
      ratios: {
        '.section-top': 0.02,
        '.section-center': 0.96,
        '.section-bottom': 0.02,
      }
    });

    this.show().then(() => {
      this.renderer = new Renderer();

      const surface = new soundworks.TouchSurface(this.view.$el, { normalizeCoordinates: true });
      surface.addListener('touchstart', this.onTouchStart);
      surface.addListener('touchmove', this.onTouchMove);
      surface.addListener('touchend', this.onTouchEnd);

      // global synth parameters
      this.sharedParams.addParamListener('period', (value) => {
        this.synth.setPeriod(value);
      });

      this.sharedParams.addParamListener('duration', (value) => {
        this.grainDuration = value;
        this.updateWindow();
      });

      this.sharedParams.addParamListener('positionVar', (value) => {
        this.grainVar = value;
        this.updateWindow();
      });

      this.sharedParams.addParamListener('resamplingVar', (value) => {
        this.synth.setResamplingVar(value);
      });

      // gain for each group
      this.sharedParams.addParamListener(`gain`, (value) => {
        const gain = dBToLin(value);
        this.synth.setGain(gain);
      });

      // once * is initialized, update state of the application
      this.sharedParams.addParamListener('state', (value) => {
        this[`${value}State`]();
      });

      this.setTouch(0.5, 0.5);
    });
  }

  waitState() {
    this.view.setState('wait');
  }

  startState() {
    this.sharedRecorder.addListener('record', [this.phase], this.onBuffer);
    this.view.setState('starting');
  }

  endState() {
    this.sharedRecorder.removeListener('record');

    this.synth.stop(releaseTime);
    this.renderer.resetBuffer(releaseTime);
    this.view.resetBackgroundColor(releaseTime);

    const text = document.getElementById('foreground');
    text.style.transitionProperty = 'opacity';
    text.style.transitionDuration = `${releaseTime + 1}s`;
    text.style.opacity = 0;

    setTimeout(() => {
      text.style.transitionProperty = 'opacity';
      text.style.transitionDuration = '0s';
      text.style.opacity = 1;

      this.view.removeRenderer(this.renderer);
      this.view.setState('end');
    }, (releaseTime + 2) * 1000);
  }

  onBuffer(buffer, phase) {
    this.bufferDuration = buffer.duration;

    this.synth.setBuffer(buffer, fadeTime);
    this.renderer.setBuffer(buffer, fadeTime);

    this.updateWindow();

    if (!this.synth.isPlaying) {
      this.synth.start();
      this.view.addRenderer(this.renderer);
      this.view.setBackgroundColor(phase, fadeTime);
    }

    this.view.setState('playing');
  }

  setTouch(x, y) {
    const position = Math.max(this.minPosition, Math.min(this.maxPosition, x * this.bufferDuration));
    const cutoff = Math.min(1, 1.5 - y);

    this.renderer.setWindowPosition(position * audioContext.sampleRate, y);
    this.renderer.setWindowOpacity(cutoff);

    this.synth.setPosition(position);
    this.synth.setCutoff(cutoff);
  }

  onTouchStart(id, x, y) {
    if (this.touchId === null) {
      this.touchId = id;
      this.setTouch(x, y);
    }
  }

  onTouchMove(id, x, y) {
    if (id === this.touchId) {
      this.setTouch(x, y);
    }
  }

  onTouchEnd(id) {
    if (id === this.touchId)
      this.touchId = null;
  }
}

export default PlayerExperience;