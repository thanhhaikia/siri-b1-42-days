import { ALL_WORDS, CLUSTERS, TOTAL_DAYS, buildReview, findReview, getDay, reviewsFor, shuffle, vocabQ } from './data.js';
import { store } from './store.js';
import { canSpeak, speak } from './speech.js';
import { runQuiz } from './quiz.js';
import { check, esc, fmt, speaker } from './ui.js';

const app = document.getElementById('app');
const byId = new Map(ALL_WORDS.map((w) => [w.id, w]));

const nextDay = () => {
  for (let n = 1; n <= TOTAL_DAYS; n++) if (!store.dayDone(n, n % 3 === 0)) return n;
  return TOTAL_DAYS;
};
const doneDays = () => Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).filter((n) => store.dayDone(n, n % 3 === 0)).length;
const matchGame = (words) => ({ kind: 'match', pairs: shuffle(words).slice(0, 6).map((w) => [w.word, w.vi]) });
const crumb = (...parts) => `<nav class="crumb">${parts.map(([t, h]) => (h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join(' › ')}</nav>`;

function home() {
  const n = nextDay();
  const due = store.dueWords().length;
  const stat = (v, l, c = '') => `<div class="stat ${c}"><b>${v}</b><span>${l}</span></div>`;
  app.innerHTML = `
  <section class="card hero">
    <span class="tag">Tự học 42 ngày · trình độ B1</span>
    <h1>Chinh phục <mark>ngữ pháp và từ vựng B1</mark></h1>
    <p class="muted">Mỗi ngày một bài, theo thứ tự chủ điểm của sách Destination B1: 28 chủ điểm ngữ pháp và 14 chủ đề từ vựng.</p>
    <div class="flow"><span><i>1</i>Từ vựng</span><em>→</em><span><i>2</i>Ngữ pháp</span><em>→</em><span><i>3</i>Bài luyện</span></div>
    <div class="stats">
      ${stat(`${doneDays()}/${TOTAL_DAYS}`, 'ngày đã xong')}
      ${stat(store.learnedCount(), 'từ đã học', 'green')}
      ${stat(due, 'từ cần ôn hôm nay', 'yellow')}
      ${stat(store.streak(), 'ngày học liên tiếp', 'yellow')}
    </div>
    <div class="row">
      <a class="btn primary" href="#/day/${n}">Học tiếp Day ${n} →</a>
      ${due ? `<a class="btn" href="#/srs">Ôn ${due} từ đến hạn</a>` : ''}
    </div>
  </section>
  <section class="card">
    <h2>Lịch 42 ngày</h2>
    <p class="muted">Mỗi cụm 3 ngày: 2 ngày ngữ pháp + 1 ngày từ vựng, cuối cụm có bài ôn. Ô viền đứt là ngày từ vựng.</p>
    ${CLUSTERS.map((c) => `
    <div class="cluster">
      <div class="cl-name"><b>Cụm ${c.index + 1}</b><span>${esc(c.name)}</span></div>
      <div class="cl-days">
        ${[1, 2, 3].map((k) => {
          const d = getDay(c.index * 3 + k);
          const done = store.dayDone(d.n, d.isVocabDay);
          return `<a class="day ${d.isVocabDay ? 'vocab' : ''} ${done ? 'done' : ''} ${d.n === n ? 'now' : ''}" href="#/day/${d.n}"><b>Day ${d.n}${done ? check : ''}</b><span>${esc(d.title)}</span></a>`;
        }).join('')}
        <div class="revs">${reviewsFor(c.index).map((r) => {
          const res = store.state.reviews[r.id];
          return `<a class="pill ${res ? 'done' : ''}" href="#/review/${r.id}">${esc(r.label)}${res ? ` · ${res.score}/${res.total}` : ''}</a>`;
        }).join('')}</div>
      </div>
    </div>`).join('')}
  </section>
  <section class="card">
    <h2>Tiến độ của bạn</h2>
    <p class="muted">Tiến độ chỉ lưu trên trình duyệt này. Xuất file để sao lưu hoặc chuyển sang máy khác.</p>
    <div class="row">
      <button type="button" class="btn" id="exp">Xuất tiến độ</button>
      <button type="button" class="btn" id="impBtn">Nhập tiến độ</button><input type="file" id="imp" accept="application/json" hidden>
      <button type="button" class="btn danger" id="reset">Xóa tiến độ</button>
    </div>
  </section>`;
  app.querySelector('#exp').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([store.export()], { type: 'application/json' }));
    a.download = 'siri-b1-tien-do.json';
    a.click();
  };
  app.querySelector('#impBtn').onclick = () => app.querySelector('#imp').click();
  app.querySelector('#imp').onchange = async (e) => {
    try { store.import(await e.target.files[0].text()); route(); } catch { alert('File không hợp lệ.'); }
  };
  app.querySelector('#reset').onclick = () => {
    if (confirm('Xóa toàn bộ tiến độ học trên máy này?')) { store.reset(); route(); }
  };
}

function dayView(n) {
  const d = getDay(n);
  const p = store.day(n);
  const part = ((n - 1) % 3) + 1;
  const task = (i, done, title, desc, btn) => `<li class="task ${done ? 'done' : ''}"><i>${done ? check : i}</i><div><h3>${title}</h3><p class="muted">${desc}</p>${btn}</div></li>`;
  const pr = p.practice ? `<span class="muted"> Lần tốt nhất: ${p.practice.score}/${p.practice.total}</span>` : '';
  const tasks = [
    task(1, p.vocab, `Học ${d.words.length} từ mới của Unit ${d.cluster.vocab.unit}`, `Chủ đề “${esc(d.cluster.name)}”, phần ${part}/3. Mỗi từ: làm quen, nghe và chọn nghĩa, rồi tự gõ lại.`, `<a class="btn primary" href="#/day/${n}/vocab">Học thẻ</a>`),
  ];
  if (d.grammar) {
    tasks.push(task(2, p.theory, `Lý thuyết: ${esc(d.grammar.title)}`, `${d.grammar.parts.length} phần ngắn, mỗi phần có một câu kiểm tra nhanh.`, `<a class="btn dark" href="#/day/${n}/theory">Học lý thuyết</a>`));
    tasks.push(task(3, p.practice, 'Bài luyện ngữ pháp', `${d.grammar.qs.length} câu, có trò chơi giải lao giữa bài, mỗi câu kèm lời giải.`, `<a class="btn dark" href="#/day/${n}/practice">Vào luyện tập</a>${pr}`));
  } else {
    tasks.push(task(2, p.practice, `Bài luyện từ vựng Unit ${n}`, `24 câu trên cả ${d.cluster.vocab.words.length} từ của chủ đề: chọn nghĩa, điền từ, nghe và gõ lại.`, `<a class="btn dark" href="#/day/${n}/practice">Vào luyện tập</a>${pr}`));
  }
  app.innerHTML = `${crumb(['Lịch 42 ngày', '#/'], [`Day ${n}`])}
  <section class="card hero">
    <span class="tag">Day ${n} / ${TOTAL_DAYS} · ${d.isVocabDay ? 'Từ vựng' : 'Ngữ pháp'}</span>
    <h1>${esc(d.title)}</h1>
    <p class="muted">${esc(d.sub)}</p>
  </section>
  <section class="card"><h2>Việc hôm nay</h2><ol class="tasks">${tasks.join('')}</ol>
    ${store.dayDone(n, d.isVocabDay) ? '<p class="fb ok"><b>Bạn đã hoàn thành ngày này.</b></p>' : ''}
  </section>
  <div class="row between">
    ${n > 1 ? `<a class="btn" href="#/day/${n - 1}">← Day ${n - 1}</a>` : '<span></span>'}
    <a class="btn" href="#/">Lịch 42 ngày</a>
    ${n < TOTAL_DAYS ? `<a class="btn" href="#/day/${n + 1}">Day ${n + 1} →</a>` : '<span></span>'}
  </div>`;
}

function vocabView(n) {
  const d = getDay(n);
  const items = [];
  for (let i = 0; i < d.words.length; i += 4) {
    const group = d.words.slice(i, i + 4);
    items.push(...group.map((w) => ({ kind: 'card', ...w })));
    items.push(...shuffle(group).map((w) => vocabQ(w, 'meaning', d.cluster.vocab.words)));
    items.push(...shuffle(group).map((w, k) => vocabQ(w, canSpeak() && k % 2 ? 'listen' : 'type')));
  }
  runQuiz(app, {
    title: `Day ${n} · Từ vựng`,
    backHref: `#/day/${n}`,
    items,
    again: () => vocabView(n),
    onDone: () => {
      store.learnWords(d.words.map((w) => w.id));
      store.setTask(n, 'vocab');
    },
  });
}

function theoryView(n) {
  const d = getDay(n);
  const g = d.grammar;
  if (!g) return dayView(n);
  let i = 0;
  let all = false;
  const answered = new Set();
  const partHtml = (p, k) => `
    <section class="card part" data-k="${k}">
      <h2><i>${k + 1}</i>${esc(p.h)}</h2>
      ${p.f ? `<p class="formula">${fmt(p.f)}</p>` : ''}
      <ul class="pts">${p.p.map((x) => `<li>${fmt(x)}</li>`).join('')}</ul>
      <div class="exs">${p.e.map((x) => {
        const cut = x.lastIndexOf(' = ');
        const [en, vi] = cut < 0 ? [x] : [x.slice(0, cut), x.slice(cut + 3)];
        return `<p><span>${fmt(en)} ${speaker(en.replace(/\*/g, '').replace(/\([^)]*[^\x00-\x7F][^)]*\)/g, '').replace(/\s*(=|→)\s*/g, ' … ').replace(/\s+([.,])/g, '$1').trim())}</span>${vi ? `<small>${esc(vi)}</small>` : ''}</p>`;
      }).join('')}</div>
      <aside class="quick"><p class="kicker">Kiểm tra nhanh</p><p class="q">${fmt(p.check.q)}</p>
        <div class="opts">${shuffle(p.check.o.map((o, j) => [o, j])).map(([o, j]) => `<button type="button" class="opt" data-j="${j}">${esc(o)}</button>`).join('')}</div>
        <div class="qfb"></div>
      </aside>
    </section>`;
  function render() {
    const total = g.parts.length;
    const last = i === total - 1;
    app.innerHTML = `${crumb(['Lịch 42 ngày', '#/'], [`Day ${n}`, `#/day/${n}`], ['Lý thuyết'])}
    <section class="card hero"><span class="tag">Day ${n} · Ngữ pháp</span><h1>${esc(g.title)}</h1><p class="muted">${esc(g.en)} · ${total} phần ngắn, khoảng 10 phút</p></section>
    <div class="quiz-top"><span>${all ? 'Cả bài' : `Phần ${i + 1}/${total}`}</span><div class="bar"><i style="width:${all ? 100 : ((i + 1) / total) * 100}%"></i></div><button type="button" class="linkbtn" id="all">${all ? 'Xem từng phần' : 'Xem cả bài'}</button></div>
    ${all ? g.parts.map(partHtml).join('') : partHtml(g.parts[i], i)}
    <div class="row between">
      ${all ? '<span></span>' : `<button type="button" class="btn" id="prev" ${i ? '' : 'disabled'}>← Phần trước</button>`}
      ${all || last ? `<button type="button" class="btn primary" id="finish" ${answered.size === total ? '' : 'disabled'}>Xong lý thuyết, vào luyện tập →</button>` : `<button type="button" class="btn dark" id="next" ${answered.has(i) ? '' : 'disabled'}>Phần sau →</button>`}
    </div>`;
    app.querySelector('#all').onclick = () => { all = !all; render(); };
    app.querySelector('#prev')?.addEventListener('click', () => { i--; render(); window.scrollTo(0, 0); });
    app.querySelector('#next')?.addEventListener('click', () => { i++; render(); window.scrollTo(0, 0); });
    app.querySelector('#finish')?.addEventListener('click', () => {
      store.setTask(n, 'theory');
      location.hash = `#/day/${n}/practice`;
    });
    app.querySelectorAll('.part').forEach((sec) => {
      const k = +sec.dataset.k;
      const c = g.parts[k].check;
      sec.querySelector('.opts').addEventListener('click', (e) => {
        const b = e.target.closest('.opt');
        if (!b || b.disabled) return;
        const ok = +b.dataset.j === c.a;
        sec.querySelectorAll('.opt').forEach((o) => { o.disabled = true; if (+o.dataset.j === c.a) o.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        sec.querySelector('.qfb').innerHTML = `<div class="fb ${ok ? 'ok' : 'no'}"><b>${ok ? 'Đúng rồi!' : 'Chưa đúng.'}</b><p>${fmt(c.why)}</p></div>`;
        answered.add(k);
        const nx = app.querySelector('#next');
        if (nx && k === i) nx.disabled = false;
        const fin = app.querySelector('#finish');
        if (fin) fin.disabled = answered.size < g.parts.length;
      });
    });
  }
  render();
}

function practiceView(n) {
  const d = getDay(n);
  let items;
  if (d.grammar) {
    const qs = d.grammar.qs;
    const half = Math.ceil(qs.length / 2);
    items = [...qs.slice(0, half), matchGame(d.words), ...qs.slice(half)];
  } else {
    const words = shuffle(d.cluster.vocab.words).slice(0, 24);
    const types = ['gap', 'meaning', 'type', 'word', 'gap', canSpeak() ? 'listen' : 'type'];
    const qs = words.map((w, i) => vocabQ(w, types[i % types.length], d.cluster.vocab.words));
    items = [...qs.slice(0, 12), matchGame(d.cluster.vocab.words), ...qs.slice(12)];
  }
  runQuiz(app, {
    title: `Day ${n} · Bài luyện`,
    backHref: `#/day/${n}`,
    items,
    again: () => practiceView(n),
    onDone: (r) => {
      const old = store.day(n).practice;
      if (!old || r.score >= old.score) store.setTask(n, 'practice', r);
    },
  });
}

function reviewView(id) {
  const review = findReview(id);
  if (!review) return home();
  runQuiz(app, {
    title: review.label,
    backHref: '#/',
    items: buildReview(review.from, review.to),
    again: () => reviewView(id),
    onDone: (r) => store.setReview(id, r),
  });
}

function srsView() {
  const due = shuffle(store.dueWords()).slice(0, 30).map((id) => byId.get(id)).filter(Boolean);
  if (!due.length) {
    app.innerHTML = `${crumb(['Lịch 42 ngày', '#/'], ['Ôn từ'])}<section class="card"><h2>Hôm nay không có từ nào đến hạn ôn</h2><p class="muted">Từ bạn đã học sẽ quay lại sau 1, 2, 4, 8, 16 rồi 32 ngày. Trả lời sai thì từ đó quay lại vào ngày mai.</p><a class="btn primary" href="#/day/${nextDay()}">Học tiếp Day ${nextDay()} →</a></section>`;
    return;
  }
  const types = ['type', 'meaning', 'gap'];
  runQuiz(app, {
    title: 'Ôn từ đến hạn',
    backHref: '#/',
    items: due.map((w, i) => vocabQ(w, types[i % types.length])),
    onAnswer: (it, ok) => store.answerWord(it.wordId, ok),
  });
}

function wordsView() {
  app.innerHTML = `${crumb(['Lịch 42 ngày', '#/'], ['Sổ từ'])}
  <section class="card hero"><span class="tag">${ALL_WORDS.length} từ và cụm từ</span><h1>Sổ từ</h1><p class="muted">Bấm vào loa để nghe. Từ đã học có dấu tích.</p></section>
  ${CLUSTERS.map((c) => `<details class="card words"><summary><b>Unit ${c.vocab.unit} · ${esc(c.name)}</b><span class="muted">${esc(c.vi)}</span></summary>
    <ul>${c.vocab.words.map((w) => `<li>${speaker(w.word)}<div><b>${esc(w.word)}</b> <em>${esc(w.pos)}</em>${store.state.srs[w.id] ? check : ''}<br>${esc(w.vi)}<br><small>${esc(w.ex)}</small></div></li>`).join('')}</ul>
  </details>`).join('')}`;
}

function route() {
  const [, a, b, c] = location.hash.replace(/^#/, '').split('/');
  const n = +b;
  const validDay = Number.isInteger(n) && n >= 1 && n <= TOTAL_DAYS;
  window.speechSynthesis?.cancel();
  if (a === 'day' && validDay) ({ vocab: vocabView, theory: theoryView, practice: practiceView }[c] || dayView)(n);
  else if (a === 'review' && b) reviewView(b);
  else if (a === 'srs') srsView();
  else if (a === 'words') wordsView();
  else home();
  const due = store.dueWords().length;
  document.getElementById('due').textContent = due || '';
  window.scrollTo(0, 0);
}

document.addEventListener('click', (e) => {
  const s = e.target.closest('[data-say]');
  if (s) speak(s.dataset.say);
});
window.addEventListener('hashchange', route);
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(() => {});
