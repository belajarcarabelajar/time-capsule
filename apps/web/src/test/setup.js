import { GlobalRegistrator } from '@happy-dom/global-registrator';
GlobalRegistrator.register();

global.IS_REACT_ACT_ENVIRONMENT = true;

// Mock window/browser APIs as needed
global.window.AudioContext = class {
  createOscillator() { return { connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {} } } }
  createGain() { return { connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } } }
  resume() {}
};
