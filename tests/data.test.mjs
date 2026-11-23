import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLUSTERS, ALL_WORDS, TOTAL_DAYS, WORDS_PER_DAY, parseQ, parseWord, getDay, reviewsFor,
  buildReview, findReview, vocabQ, normalize, isCorrect,
} from '../js/data.js';

test('parseQ reads multiple choice and gap lines', () => {
  const mc = parseQ('She ___ tea. | like | *likes | liking | Ngôi ba số ít.');
  assert.deepEqual(mc, { kind: 'mc', q: 'She ___ tea.', o: ['like', 'likes', 'liking'], a: 1, why: 'Ngôi ba số ít.' });
  const gap = parseQ("I ___ (not/go). = didn't go / did not go | Quá khứ đơn.");
  assert.deepEqual(gap, { kind: 'gap', q: 'I ___ (not/go).', a: ["didn't go", 'did not go'], why: 'Quá khứ đơn.' });
});

test('parseWord blanks the target in the example', () => {
  const w = parseWord('take up | phr v | bắt đầu | I want to {take up} chess.', 'u03', 4);
  assert.equal(w.id, 'u03:4');
  assert.equal(w.ex, 'I want to take up chess.');
  assert.equal(w.gap, 'I want to ___ chess.');
});

test('course has 14 clusters, 28 grammar units and 42 days', () => {
  assert.equal(CLUSTERS.length, 14);
  assert.equal(CLUSTERS.flatMap((c) => c.grammar).length, 28);
  assert.equal(TOTAL_DAYS, 42);
  assert.equal(ALL_WORDS.length, 14 * 3 * WORDS_PER_DAY);
});

test('every question is well formed', () => {
  for (const c of CLUSTERS) for (const g of c.grammar) {
    assert.ok(g.parts.length >= 3, `${g.id} parts`);
    assert.ok(g.qs.length >= 16, `${g.id} questions`);
    for (const q of [...g.parts.map((p) => p.check), ...g.qs]) {
      assert.ok(q.q && q.why, `${g.id}: ${q.q}`);
      if (q.kind === 'mc') {
        assert.ok(q.o.length >= 3, `${g.id} options: ${q.q}`);
        assert.ok(q.a >= 0, `${g.id} no correct option: ${q.q}`);
        assert.equal(new Set(q.o).size, q.o.length, `${g.id} duplicate options: ${q.q}`);
        assert.ok(!q.o.some((o) => o.startsWith('*')), `${g.id} two correct options: ${q.q}`);
      } else {
        assert.ok(q.a.length && q.a.every(Boolean), `${g.id} gap answer: ${q.q}`);
        assert.ok(isCorrect(q, q.a[0]));
      }
    }
  }
});

test('every word is unique and has a usable example', () => {
  const seen = new Set();
  for (const w of ALL_WORDS) {
    assert.ok(w.word && w.pos && w.vi && w.ex, w.id);
    assert.ok(w.gap.includes('___'), `${w.word}: example needs {target}`);
    assert.ok(!seen.has(w.word), `duplicate word: ${w.word}`);
    seen.add(w.word);
  }
});

test('getDay maps two grammar days then one vocabulary day', () => {
  assert.equal(getDay(1).grammar.unit, 1);
  assert.equal(getDay(2).grammar.unit, 2);
  assert.equal(getDay(3).isVocabDay, true);
  assert.equal(getDay(3).grammar, null);
  assert.equal(getDay(42).cluster.index, 13);
  const ids = new Set();
  for (let n = 1; n <= TOTAL_DAYS; n++) {
    const d = getDay(n);
    assert.equal(d.words.length, WORDS_PER_DAY);
    d.words.forEach((w) => ids.add(w.id));
  }
  assert.equal(ids.size, ALL_WORDS.length);
});

test('reviewsFor adds cluster, 6-day, mid and final reviews', () => {
  assert.deepEqual(reviewsFor(0).map((r) => r.id), ['1-3']);
  assert.deepEqual(reviewsFor(1).map((r) => r.id), ['4-6', '1-6']);
  assert.deepEqual(reviewsFor(6).map((r) => r.id), ['19-21', '1-21']);
  assert.deepEqual(reviewsFor(13).map((r) => r.id), ['40-42', '37-42', '22-42']);
});

test('buildReview mixes grammar and vocabulary', () => {
  const r = buildReview(1, 3);
  assert.equal(r.length, 24);
  assert.ok(r.some((q) => q.wordId) && r.some((q) => !q.wordId));
  assert.equal(buildReview(1, 21).length, 40);
});

test('vocabQ always includes the right answer once', () => {
  for (const type of ['meaning', 'word', 'gap']) {
    for (const w of ALL_WORDS.slice(0, 60)) {
      const q = vocabQ(w, type);
      assert.equal(q.o.length, 4);
      assert.equal(new Set(q.o).size, 4);
      assert.equal(q.o[q.a], type === 'meaning' ? w.vi : w.word);
    }
  }
  assert.deepEqual(vocabQ(ALL_WORDS[0], 'type').a, [ALL_WORDS[0].word]);
});

test('normalize and isCorrect forgive case, spacing and curly quotes', () => {
  assert.equal(normalize('  Didn’t   GO. '), "didn't go");
  assert.ok(isCorrect({ a: ["didn't go", 'did not go'] }, 'Did not go'));
  assert.ok(!isCorrect({ a: ['went'] }, 'goed'));
});

test('findReview only knows the reviews listed on the schedule', () => {
  assert.equal(findReview('1-3').label, 'Ôn tập Day 1–3');
  assert.equal(findReview('1-21').from, 1);
  assert.equal(findReview('22-42').to, 42);
  for (const id of ['1.5-3', '2-3', '3-1', '1-43', 'abc', '']) assert.equal(findReview(id), undefined, id);
});
