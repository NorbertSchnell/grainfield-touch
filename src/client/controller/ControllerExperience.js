import { Experience, View } from 'soundworks/client';
import SharedParamsComponent from './SharedParamsComponent';
import LogComponent from './LogComponent';

const template = `
  <div id="shared-params"></div>
  <div id="log"></div>
`;

class ControllerExperience extends Experience {
  constructor(options = {}) {
    super();

    const sharedParams = this.require('shared-params');
    const sharedParamsComponent = new SharedParamsComponent(this, sharedParams);

    sharedParamsComponent.setGuiOptions('numPlayers', { readonly: true });
    sharedParamsComponent.setGuiOptions('state', { type: 'buttons' });
    sharedParamsComponent.setGuiOptions('record', { type: 'buttons' });
    sharedParamsComponent.setGuiOptions('gain', { type: 'slider', size: 'large' });   
    sharedParamsComponent.setGuiOptions('period', { type: 'slider', size: 'large' });
    sharedParamsComponent.setGuiOptions('duration', { type: 'slider', size: 'large' });
    sharedParamsComponent.setGuiOptions('positionVar', { type: 'slider', size: 'large' });
    sharedParamsComponent.setGuiOptions('resamplingVar', { type: 'slider', size: 'large' });
    sharedParamsComponent.setGuiOptions('outputGain', { type: 'slider', size: 'large' });

    this.sharedParamsComponent = sharedParamsComponent;
    this.logComponent = new LogComponent(this);

    if (options.auth)
      this.auth = this.require('auth');
  }

  start() {
    super.start();

    this.view = new View(template, {}, {}, { id: 'controller' });

    this.show().then(() => {
      this.sharedParamsComponent.enter();
      this.logComponent.enter();

      this.receive('log', (type, ...args) => {
        switch (type) {
          case 'error':
            this.logComponent.error(...args);
            break;
        }
      });

    });
  }
}

export default ControllerExperience;
