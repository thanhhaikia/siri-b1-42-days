import test from 'node:test';
import assert from 'node:assert/strict';

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
const listeners = {};
globalThis.addEventListener = (type, fn) => { listeners[type] = fn; };
const { store, srsNext, streak, dayNumber, INTERVALS } = await import('../js/store.js');

test('srsNext moves a word up one box when right and back to box 1 when wrong', () => {
  assert.deepEqual(srsNext({ box: 1, due: 0 }, true, 100), { box: 2, due: 100 + INTERVALS[2] });
  assert.deepEqual(srsNext({ box: 4, due: 0 }, false, 100), { box: 1, due: 101 });
  const top = INTERVALS.length - 1;
  assert.deepEqual(srsNext({ box: top, due: 0 }, true, 100), { box: top, due: 100 + INTERVALS[top] });
});

test('streak counts consecutive days ending today or yesterday', () => {
  assert.equal(streak([], 10), 0);
  assert.equal(streak([8, 9, 10], 10), 3);
  assert.equal(streak([8, 9], 10), 2);
  assert.equal(streak([7, 8], 10), 0);
  assert.equal(streak([5, 9, 10], 10), 2);
});

test('a grammar day needs vocab, theory and practice; a vocab day skips theory', () => {
  store.reset();
  store.setTask(1, 'vocab');
  store.setTask(1, 'practice');
  assert.equal(store.dayDone(1, false), false);
  assert.equal(store.dayDone(1, true), true);
  store.setTask(1, 'theory');
  assert.equal(store.dayDone(1, false), true);
  assert.equal(store.streak(), 1);
});

test('learned words come due the next day and reviews keep the best score', () => {
  store.reset();
  store.learnWords(['u03:0', 'u03:1']);
  store.learnWords(['u03:0']);
  assert.equal(store.learnedCount(), 2);
  assert.deepEqual(store.dueWords(), []);
  store.state.srs['u03:0'].due = dayNumber();
  assert.deepEqual(store.dueWords(), ['u03:0']);
  store.answerWord('u03:0', true);
  assert.deepEqual(store.dueWords(), []);
  store.setReview('1-3', { score: 80 });
  store.setReview('1-3', { score: 60 });
  assert.equal(store.state.reviews['1-3'].score, 80);
});

test('export and import round-trip, bad files are rejected', () => {
  store.reset();
  store.setTask(2, 'theory');
  store.learnWords(['u03:5']);
  const json = store.export();
  store.reset();
  assert.equal(store.learnedCount(), 0);
  store.import(json);
  assert.equal(store.day(2).theory, true);
  assert.equal(store.learnedCount(), 1);
  assert.throws(() => store.import('{"x":1}'));
  assert.throws(() => store.import('not json'));
  assert.equal(JSON.parse(mem.get('sirib1.v1')).days[2].theory, true);
});

test('a file with the wrong shape is rejected and leaves progress untouched', () => {
  store.reset();
  store.setTask(1, 'vocab');
  store.learnWords(['u03-0']);
  const before = store.export();
  for (const bad of [
    '{"days":{},"srs":{},"dates":{}}',
    '{"days":{},"srs":{},"dates":null}',
    '{"days":[],"srs":{}}',
    '{"days":{"1":true},"srs":{}}',
    '{"days":{"1":{"practice":{"score":"<img src=x onerror=alert(1)>","total":16}}},"srs":{}}',
    '{"days":{"1":{"vocab":"<b>x</b>"}},"srs":{}}',
    '{"days":{},"srs":{"u03-0":{"box":9,"due":1}}}',
    '{"days":{},"srs":{"u03-0":{"box":1}}}',
    '{"days":{},"srs":{},"reviews":{"1-3":5}}',
    '{"days":{},"srs":{},"dates":["today"]}',
    'null',
    '[]',
  ]) {
    assert.throws(() => store.import(bad), bad);
    assert.equal(store.export(), before, bad);
  }
  assert.equal(globalThis.localStorage.getItem('sirib1.v1'), before);
});

test('a file with only days and srs still imports', () => {
  store.import('{"days":{"2":{"vocab":true}},"srs":{}}');
  assert.deepEqual(store.state, { days: { 2: { vocab: true } }, reviews: {}, srs: {}, dates: [] });
});

const KEY = 'sirib1.v1';
const otherTabSaves = (json) => {
  const event = { key: KEY, newValue: json };
  if (json === null) mem.delete(KEY); else mem.set(KEY, json);
  return event;
};

test('progress saved by another tab is adopted instead of overwritten', () => {
  store.reset();
  store.setTask(1, 'vocab');
  const other = JSON.parse(store.export());
  other.days[2] = { vocab: true };
  listeners.storage(otherTabSaves(JSON.stringify(other)));
  store.setTask(3, 'vocab');
  assert.deepEqual(Object.keys(JSON.parse(mem.get(KEY)).days), ['1', '2', '3']);

  listeners.storage({ key: 'another.app', newValue: '{}' });
  assert.equal(Object.keys(store.state.days).length, 3);
  listeners.storage(otherTabSaves(null));
  assert.deepEqual(store.state.days, {});
});

test('a storage event delivered after a reset does not bring the deleted progress back', () => {
  store.reset();
  store.setTask(1, 'vocab');
  const late = otherTabSaves(JSON.stringify({ days: { 1: { vocab: true }, 2: { vocab: true } }, srs: {} }));
  store.reset();
  listeners.storage(late);
  store.setTask(5, 'vocab');
  assert.deepEqual(Object.keys(JSON.parse(mem.get(KEY)).days), ['5']);
});
