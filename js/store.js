// Progress in localStorage. Dates are local calendar days counted from the epoch.
const KEY = 'sirib1.v1';
export const INTERVALS = [0, 1, 2, 4, 8, 16, 32];

export function dayNumber(d = new Date()) {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

export function srsNext(entry, correct, today) {
  const box = correct ? Math.min((entry?.box ?? 0) + 1, INTERVALS.length - 1) : 1;
  return { box, due: today + INTERVALS[box] };
}

export function streak(dates, today) {
  const set = new Set(dates);
  let d = set.has(today) ? today : today - 1;
  let n = 0;
  while (set.has(d)) { n++; d--; }
  return n;
}

const blank = () => ({ days: {}, reviews: {}, srs: {}, dates: [] });
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isResult = (v) => isObj(v) && Number.isFinite(v.score) && Number.isFinite(v.total);

// Returns saved progress reduced to its known fields, or null when the shape is wrong.
export function clean(s) {
  if (!isObj(s)) return null;
  const { days, reviews = {}, srs, dates = [] } = s;
  if (![days, reviews, srs].every(isObj) || !Array.isArray(dates)) return null;
  if (!Object.values(days).every((d) => isObj(d) && Object.values(d).every((v) => v === true || isResult(v)))) return null;
  if (!Object.values(reviews).every(isResult)) return null;
  if (!Object.values(srs).every((e) => isObj(e) && INTERVALS[e.box] !== undefined && Number.isFinite(e.due))) return null;
  if (!dates.every(Number.isInteger)) return null;
  return { days, reviews, srs, dates };
}

let state = blank();
try {
  state = clean(JSON.parse(localStorage.getItem(KEY) || 'null')) || blank();
} catch { /* no storage: keep progress in memory */ }

// Another tab saved or cleared progress: adopt it so this tab's next save does not overwrite it.
// Events can arrive late (after this tab's own save), so read what is stored now, not e.newValue.
globalThis.addEventListener?.('storage', (e) => {
  if (e.key !== null && e.key !== KEY) return;
  try { state = clean(JSON.parse(localStorage.getItem(KEY))) || blank(); } catch { state = blank(); }
});

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function touch() {
  const t = dayNumber();
  if (!state.dates.includes(t)) state.dates.push(t);
}

export const store = {
  get state() { return state; },
  day(n) { return state.days[n] || {}; },
  setTask(n, task, value = true) {
    state.days[n] = { ...state.days[n], [task]: value };
    touch(); save();
  },
  dayDone(n, isVocabDay) {
    const d = this.day(n);
    return !!(d.vocab && d.practice && (isVocabDay || d.theory));
  },
  setReview(id, result) {
    const old = state.reviews[id];
    if (!old || result.score >= old.score) state.reviews[id] = result;
    touch(); save();
  },
  learnWords(ids) {
    const today = dayNumber();
    for (const id of ids) if (!state.srs[id]) state.srs[id] = { box: 1, due: today + 1 };
    save();
  },
  answerWord(id, correct) {
    if (!state.srs[id]) return;
    state.srs[id] = srsNext(state.srs[id], correct, dayNumber());
    touch(); save();
  },
  dueWords() {
    const today = dayNumber();
    return Object.keys(state.srs).filter((id) => state.srs[id].due <= today);
  },
  learnedCount() { return Object.keys(state.srs).length; },
  streak() { return streak(state.dates, dayNumber()); },
  export() { return JSON.stringify(state); },
  import(json) {
    const s = clean(JSON.parse(json));
    if (!s) throw new Error('bad file');
    state = s;
    save();
  },
  reset() { state = blank(); save(); },
};
