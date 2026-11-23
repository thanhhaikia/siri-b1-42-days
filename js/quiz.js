// One-question-at-a-time runner for cards, multiple choice, typed gaps and the matching game.
import { isCorrect, shuffle } from './data.js';
import { speak } from './speech.js';
import { esc, fmt, speaker } from './ui.js';

export function runQuiz(root, { title, backHref, items, onAnswer, onDone, again }) {
  const queue = items.map((it) => ({ ...it }));
  const scored = queue.filter((i) => i.kind === 'mc' || i.kind === 'gap').length;
  let pos = 0;
  let right = 0;

  const nextBtn = (label = 'Câu tiếp →') => `<button type="button" class="btn primary" id="next">${label}</button>`;
  const bindNext = (box) => {
    const b = box.querySelector('#next');
    b.addEventListener('click', () => { pos++; show(); });
    b.focus();
  };

  function settle(box, it, ok, answerText) {
    if (!it.retry) {
      if (ok) right++;
      onAnswer?.(it, ok);
      if (!ok) queue.push({ ...it, retry: true });
    }
    box.insertAdjacentHTML('beforeend', `<div class="fb ${ok ? 'ok' : 'no'}" role="status"><b>${ok ? 'Đúng rồi!' : 'Chưa đúng.'}</b>${ok ? '' : ` Đáp án: <b>${esc(answerText)}</b>`}${it.why ? `<p>${fmt(it.why)}</p>` : ''}${!ok && !it.retry ? '<p class="muted">Câu này sẽ quay lại ở cuối bài.</p>' : ''}</div>${nextBtn()}`);
    bindNext(box);
  }

  const kinds = {
    card(box, it) {
      box.innerHTML = `<p class="kicker">Làm quen từ mới</p><div class="word-row"><h2 class="word">${esc(it.word)}</h2>${speaker(it.word)}</div><p class="pos">${esc(it.pos)}</p><p class="vi">${esc(it.vi)}</p><p class="ex">${esc(it.ex)} ${speaker(it.ex, 'Nghe câu ví dụ')}</p>${nextBtn('Tiếp →')}`;
      speak(it.word);
      bindNext(box);
    },
    mc(box, it) {
      const order = shuffle(it.o.map((_, i) => i));
      box.innerHTML = `<p class="kicker">${it.retry ? 'Làm lại' : 'Chọn đáp án đúng'}</p><p class="q">${fmt(it.q)} ${it.say ? speaker(it.say) : ''}</p><div class="opts">${order.map((i) => `<button type="button" class="opt" data-i="${i}">${esc(it.o[i])}</button>`).join('')}</div>`;
      if (it.say) speak(it.say);
      box.querySelector('.opts').addEventListener('click', (e) => {
        const b = e.target.closest('.opt');
        if (!b || b.disabled) return;
        const ok = +b.dataset.i === it.a;
        box.querySelectorAll('.opt').forEach((o) => {
          o.disabled = true;
          if (+o.dataset.i === it.a) o.classList.add('right');
        });
        if (!ok) b.classList.add('wrong');
        settle(box, it, ok, it.o[it.a]);
      });
    },
    gap(box, it) {
      box.innerHTML = `<p class="kicker">${it.retry ? 'Làm lại' : 'Gõ câu trả lời'}</p><p class="q">${fmt(it.q)} ${it.say ? speaker(it.say) : ''}</p><form class="gap-form"><input type="text" id="ans" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Gõ đáp án…" aria-label="Đáp án"><button class="btn dark">Kiểm tra</button></form>`;
      if (it.autoSay) speak(it.say);
      const input = box.querySelector('#ans');
      input.focus();
      box.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!input.value.trim() || input.disabled) return;
        const ok = isCorrect(it, input.value);
        input.disabled = true;
        e.target.querySelector('button').disabled = true;
        input.classList.add(ok ? 'right' : 'wrong');
        settle(box, it, ok, it.a[0]);
      });
    },
    match(box, it) {
      const left = shuffle(it.pairs.map((p, i) => [i, p[0]]));
      const rightCol = shuffle(it.pairs.map((p, i) => [i, p[1]]));
      const col = (list, side) => `<div class="mcol">${list.map(([i, t]) => `<button type="button" class="mbtn" data-side="${side}" data-i="${i}">${esc(t)}</button>`).join('')}</div>`;
      box.innerHTML = `<p class="kicker">Giải lao · Ghép nghĩa</p><p class="q">Bấm một từ tiếng Anh rồi bấm nghĩa tiếng Việt của nó.</p><div class="match">${col(left, 'l')}${col(rightCol, 'r')}</div><div id="mdone"></div>`;
      let picked = null;
      let left_ = it.pairs.length;
      box.querySelector('.match').addEventListener('click', (e) => {
        const b = e.target.closest('.mbtn');
        if (!b || b.disabled) return;
        if (!picked || picked.dataset.side === b.dataset.side) {
          picked?.classList.remove('sel');
          picked = b;
          b.classList.add('sel');
          return;
        }
        const a = picked;
        picked = null;
        a.classList.remove('sel');
        if (a.dataset.i === b.dataset.i) {
          for (const x of [a, b]) { x.disabled = true; x.classList.add('done'); }
          if (--left_ === 0) {
            box.querySelector('#mdone').innerHTML = `<div class="fb ok"><b>Ghép xong!</b></div>${nextBtn('Tiếp tục →')}`;
            bindNext(box);
          }
        } else {
          for (const x of [a, b]) { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 450); }
        }
      });
    },
  };

  function finish() {
    const result = { score: right, total: scored };
    onDone?.(result);
    const pct = scored ? Math.round((right / scored) * 100) : 100;
    root.innerHTML = `<section class="card done-card"><p class="kicker">${esc(title)}</p><h2>Hoàn thành!</h2>${scored ? `<p class="big">${right}/${scored}</p><p class="muted">câu đúng ngay lần đầu (${pct}%)</p>` : ''}<p>${pct >= 80 ? 'Rất tốt, bạn nắm chắc phần này rồi.' : 'Bạn nên xem lại lý thuyết rồi làm lại để chắc hơn.'}</p><div class="row">${again ? '<button type="button" class="btn" id="again">Làm lại</button>' : ''}<a class="btn primary" href="${backHref}">Quay lại</a></div></section>`;
    root.querySelector('#again')?.addEventListener('click', again);
  }

  function show() {
    if (pos >= queue.length) return finish();
    const it = queue[pos];
    root.innerHTML = `<div class="quiz-top"><a href="${backHref}">← Thoát</a><b>${esc(title)}</b><span>${pos + 1}/${queue.length}</span></div><div class="bar" aria-hidden="true"><i style="width:${(pos / queue.length) * 100}%"></i></div><section class="card quiz" id="qbox"></section>`;
    kinds[it.kind](root.querySelector('#qbox'), it);
    window.scrollTo(0, 0);
  }

  show();
}
