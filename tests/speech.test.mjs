import test from 'node:test';
import assert from 'node:assert/strict';

let voices = [];
let onLine = true;
const spoken = [];
globalThis.speechSynthesis = { getVoices: () => voices, cancel() {}, speak: (u) => spoken.push(u) };
globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { get onLine() { return onLine; } } });
const { canSpeak, speak } = await import('../js/speech.js');

const remote = { name: 'Google UK English Female', lang: 'en-GB', localService: false };
const local = { name: 'Samantha', lang: 'en-US', localService: true };
const vietnamese = { name: 'Linh', lang: 'vi-VN', localService: true };

test('canSpeak needs an English voice', () => {
  voices = [];
  assert.equal(canSpeak(), false);
  voices = [vietnamese];
  assert.equal(canSpeak(), false);
  voices = [vietnamese, local];
  assert.equal(canSpeak(), true);
});

test('a remote voice only counts while online', () => {
  voices = [remote];
  onLine = true;
  assert.equal(canSpeak(), true);
  onLine = false;
  assert.equal(canSpeak(), false);
});

test('speak uses the preferred voice online and a local one offline', () => {
  voices = [local, remote];
  onLine = true;
  speak('hello');
  assert.equal(spoken.at(-1).voice, remote);
  onLine = false;
  speak('hello');
  assert.equal(spoken.at(-1).voice, local);
  assert.equal(spoken.at(-1).lang, 'en-US');
});
