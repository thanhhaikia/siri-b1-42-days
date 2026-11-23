// Curriculum: 14 clusters x 3 days. Day n studies unit n; days 3, 6, 9... are vocabulary days.
import c01 from './content/c01.js';
import c02 from './content/c02.js';
import c03 from './content/c03.js';
import c04 from './content/c04.js';
import c05 from './content/c05.js';
import c06 from './content/c06.js';
import c07 from './content/c07.js';
import c08 from './content/c08.js';
import c09 from './content/c09.js';
import c10 from './content/c10.js';
import c11 from './content/c11.js';
import c12 from './content/c12.js';
import c13 from './content/c13.js';
import c14 from './content/c14.js';

export const WORDS_PER_DAY = 12;
export const TOTAL_DAYS = 42;

// "Question | opt | *correct | opt | why"  or  "Question = answer / other answer | why"
export function parseQ(line) {
  const f = line.split('|').map((s) => s.trim());
  const why = f.at(-1);
  if (f.length === 2) {
    const i = f[0].lastIndexOf(' = ');
    return { kind: 'gap', q: f[0].slice(0, i).trim(), a: f[0].slice(i + 3).split(' / ').map((s) => s.trim()), why };
  }
  const opts = f.slice(1, -1);
  return { kind: 'mc', q: f[0], o: opts.map((o) => o.replace(/^\*/, '')), a: opts.findIndex((o) => o.startsWith('*')), why };
}

// "word | pos | nghĩa | Example with the {target} in braces."
export function parseWord(line, unit, i) {
  const [word, pos, vi, ex] = line.split('|').map((s) => s.trim());
  return { id: `${unit}:${i}`, word, pos, vi, ex: ex.replace(/[{}]/g, ''), gap: ex.replace(/\{[^}]*\}/, '___') };
}

const pad = (n) => String(n).padStart(2, '0');

export const CLUSTERS = [c01, c02, c03, c04, c05, c06, c07, c08, c09, c10, c11, c12, c13, c14].map((c, ci) => {
  const vid = `u${pad(ci * 3 + 3)}`;
  return {
    index: ci,
    name: c.name,
    vi: c.vi,
    grammar: c.grammar.map((g, gi) => ({
      id: `u${pad(ci * 3 + gi + 1)}`,
      unit: ci * 3 + gi + 1,
      title: g.title,
      en: g.en,
      parts: g.parts.map((p) => ({ ...p, check: parseQ(p.c) })),
      qs: g.qs.map(parseQ),
    })),
    vocab: { id: vid, unit: ci * 3 + 3, words: c.words.map((w, i) => parseWord(w, vid, i)) },
  };
});

export const ALL_WORDS = CLUSTERS.flatMap((c) => c.vocab.words);

export function getDay(n) {
  const ci = Math.floor((n - 1) / 3);
  const p = (n - 1) % 3;
  const cluster = CLUSTERS[ci];
  return {
    n,
    cluster,
    isVocabDay: p === 2,
    grammar: p < 2 ? cluster.grammar[p] : null,
    words: cluster.vocab.words.slice(p * WORDS_PER_DAY, (p + 1) * WORDS_PER_DAY),
    title: p < 2 ? cluster.grammar[p].title : `Từ vựng: ${cluster.name}`,
    sub: p < 2 ? `Unit ${n} · ${cluster.grammar[p].en}` : `Unit ${n} · ${cluster.vi}`,
  };
}

// Reviews listed under cluster ci: the cluster itself, every second cluster a 6-day review,
// plus mid-course (days 1-21) and final (days 22-42).
export function reviewsFor(ci) {
  const end = ci * 3 + 3;
  const out = [{ from: end - 2, to: end, label: `Ôn tập Day ${end - 2}–${end}` }];
  if (ci % 2 === 1) out.push({ from: end - 5, to: end, label: `Ôn tổng hợp Day ${end - 5}–${end}` });
  if (ci === 6) out.push({ from: 1, to: 21, label: 'Ôn giữa khóa Day 1–21' });
  if (ci === 13) out.push({ from: 22, to: 42, label: 'Ôn cuối khóa Day 22–42' });
  return out.map((r) => ({ ...r, id: `${r.from}-${r.to}` }));
}

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distractors(w, pool, key, n = 3) {
  const seen = new Set([w[key]]);
  const out = [];
  const samePos = shuffle(pool.filter((x) => x.pos === w.pos));
  for (const x of [...samePos, ...shuffle(pool)]) {
    if (out.length === n) break;
    if (!seen.has(x[key])) { seen.add(x[key]); out.push(x[key]); }
  }
  return out;
}

// Vocabulary question generators. `type`: meaning | word | gap | type | listen
export function vocabQ(w, type, pool = ALL_WORDS) {
  const mc = (q, key, extra = {}) => {
    const o = shuffle([w[key], ...distractors(w, pool, key)]);
    return { kind: 'mc', q, o, a: o.indexOf(w[key]), wordId: w.id, ...extra };
  };
  const full = `${w.word} (${w.pos}): ${w.vi}. Ví dụ: ${w.ex}`;
  switch (type) {
    case 'meaning': return mc(`“${w.word}” nghĩa là gì?`, 'vi', { say: w.word, why: `Ví dụ: ${w.ex}` });
    case 'word': return mc(`Từ nào có nghĩa “${w.vi}”?`, 'word', { why: full });
    case 'gap': return mc(`Chọn từ hợp với chỗ trống (dạng gốc): ${w.gap}`, 'word', { why: `${w.ex} — ${w.word}: ${w.vi}` });
    case 'listen': return { kind: 'gap', q: 'Nghe và gõ lại từ hoặc cụm từ bạn nghe được.', a: [w.word], say: w.word, autoSay: true, why: full, wordId: w.id };
    default: return { kind: 'gap', q: `Gõ từ tiếng Anh (${w.pos}, bắt đầu bằng “${w.word[0]}”): ${w.vi}`, a: [w.word], why: full, wordId: w.id };
  }
}

export function daysIn(from, to) {
  const out = [];
  for (let n = from; n <= to; n++) out.push(getDay(n));
  return out;
}

export function buildReview(from, to) {
  const days = daysIn(from, to);
  const total = Math.min(40, 12 + 4 * days.length);
  const gq = shuffle(days.filter((d) => d.grammar).flatMap((d) => d.grammar.qs));
  const words = shuffle(days.flatMap((d) => d.words));
  const nV = Math.round(total / 3);
  const types = ['meaning', 'gap', 'type', 'word'];
  const vq = words.slice(0, nV).map((w, i) => vocabQ(w, types[i % types.length]));
  return shuffle([...gq.slice(0, total - vq.length), ...vq]);
}

export function normalize(s) {
  return s.toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!?,]+$/g, '').trim();
}

export function isCorrect(item, answer) {
  const n = normalize(answer);
  return item.a.some((a) => normalize(a) === n);
}
