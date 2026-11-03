/* Interactive e-workbook: tap-and-check tasks scored on the first check, plus written answers for Ms. Maria.
   Content lives in levels/levelN/sNN.json → workbook { intro, tasks[], written[] }.
   Task types: pick (tap one option per item), match (choose from a list), order (tap in the right order), calc (type a number). */
(function (root) {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function $(s, el) { return el.querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call(el.querySelectorAll(s)); }
  // the same shuffle every time for the same task (so the page does not jump around)
  function shuffle(arr, seed) {
    var a = arr.slice(), h = 0; for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    for (var j = a.length - 1; j > 0; j--) { h = (h * 1103515245 + 12345) >>> 0; var k = h % (j + 1), t = a[j]; a[j] = a[k]; a[k] = t; }
    return a;
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function options(t) { return t.options || shuffle(uniq(t.items.map(function (it) { return it.answer; })), t.id + 'o'); }
  function size(t) { return t.items.length; }
  function isRight(t, i, v) {
    var it = t.items[i];
    if (t.type === 'order') return v === i;
    if (t.type === 'calc') { var n = Number(String(v).replace(/,/g, '')); return v !== '' && isFinite(n) && Math.abs(n - it.answer) <= (it.tol || 0); }
    return v === it.answer;
  }
  function blank() { return { sel: {}, done: {}, written: {} }; }
  function score(c, st) {
    var s = 0, t = 0, checked = 0;
    c.workbook.tasks.forEach(function (task) { t += size(task); var d = st.done[task.id]; if (d) { checked++; s += d.filter(Boolean).length; } });
    return { score: s, total: t, checked: checked, tasks: c.workbook.tasks.length };
  }

  function taskHtml(task, k, st) {
    var sel = st.sel[task.id] || {}, done = st.done[task.id], locked = !!done, body = '';
    if (task.type === 'pick') {
      var opts = options(task);
      body = task.items.map(function (it, i) {
        var mark = locked ? (done[i] ? ' right' : ' wrong') : '';
        return '<div class="wb-row' + mark + '"><p>' + md(it.text) + '</p><div class="wb-picks">' + opts.map(function (o) {
          return '<button type="button" class="wb-pick" data-i="' + i + '" data-v="' + esc(o) + '" aria-pressed="' + (sel[i] === o) + '"' + (locked ? ' disabled' : '') + '>' + esc(o) + '</button>';
        }).join('') + '</div>' + (locked && !done[i] ? '<small class="wb-fix">Answer: <b>' + esc(it.answer) + '</b>' + (it.why ? ' · ' + md(it.why) : '') + '</small>' : '') + '</div>';
      }).join('');
    } else if (task.type === 'match') {
      var mo = options(task);
      body = task.items.map(function (it, i) {
        var mark = locked ? (done[i] ? ' right' : ' wrong') : '';
        return '<div class="wb-row wb-match' + mark + '"><p><b>' + md(it.text) + '</b></p><select class="input" data-i="' + i + '"' + (locked ? ' disabled' : '') + '><option value="">Choose…</option>' +
          mo.map(function (o) { return '<option' + (sel[i] === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' +
          (locked && !done[i] ? '<small class="wb-fix">Answer: <b>' + esc(it.answer) + '</b></small>' : '') + '</div>';
      }).join('');
    } else if (task.type === 'calc') {
      body = task.items.map(function (it, i) {
        var mark = locked ? (done[i] ? ' right' : ' wrong') : '';
        return '<div class="wb-row wb-match' + mark + '"><p>' + md(it.text) + '</p><label class="wb-num"><input class="input" inputmode="decimal" data-i="' + i + '" value="' + esc(sel[i] == null ? '' : sel[i]) + '"' + (locked ? ' disabled' : '') + '>' + (it.unit ? '<span>' + esc(it.unit) + '</span>' : '') + '</label>' +
          (locked && !done[i] ? '<small class="wb-fix">Answer: <b>' + esc(it.answer) + (it.unit ? ' ' + esc(it.unit) : '') + '</b>' + (it.why ? ' · ' + md(it.why) : '') + '</small>' : '') + '</div>';
      }).join('');
    } else if (task.type === 'order') {
      var seq = sel.seq || [], pool = shuffle(task.items.map(function (x, i) { return i; }), task.id).filter(function (i) { return seq.indexOf(i) === -1; });
      body = '<div class="wb-pool">' + pool.map(function (i) { return '<button type="button" class="wb-chip" data-add="' + i + '"' + (locked ? ' disabled' : '') + '>' + md(task.items[i].text) + '</button>'; }).join('') +
        (pool.length ? '' : '<span class="muted small">All placed.</span>') + '</div><ol class="wb-seq">' + seq.map(function (i, p) {
          var mark = locked ? (done[p] ? ' right' : ' wrong') : '';
          return '<li class="' + mark + '">' + md(task.items[i].text) + (locked && !done[p] ? '<small class="wb-fix">Should be: <b>' + md(task.items[p].text) + '</b></small>' : '') + '</li>';
        }).join('') + '</ol>' + (!locked && seq.length ? '<button type="button" class="linkbtn" data-reset="1">Start again</button>' : '');
    }
    var got = locked ? done.filter(Boolean).length : 0;
    return '<section class="card wb-task st-' + (task.stage || ['Plan', 'Source', 'Make', 'Deliver', 'Return'][k % 5]) + '" id="wb-' + task.id + '" data-task="' + task.id + '">' +
      '<div class="wb-head"><div><div class="eyebrow muted">Task ' + (k + 1) + (task.slide ? ' · Slide ' + task.slide : '') + '</div><h3 class="h3">' + esc(task.title) + '</h3></div>' +
      (locked ? '<span class="chip ' + (got === size(task) ? 'done' : 'gold') + '">' + got + ' / ' + size(task) + '</span>' : '<span class="chip">' + size(task) + ' points</span>') + '</div>' +
      (task.intro ? '<p class="sub">' + md(task.intro) + '</p>' : '') + body +
      (locked ? '<p class="small muted wb-locked">Checked. Your first check is your score.</p>' : '<div class="btns"><button type="button" class="btn" data-check="1">Check task ' + (k + 1) + '</button></div>') + '</section>';
  }

  function render(n, c, ctx) {
    var W = c.workbook, st = ctx.draft() || blank(), sc = score(c, st), res = ctx.result();
    return '<div class="wb">' +
      '<div class="card pad wb-top"><div><h2 class="h2" style="font-size:1.15rem;margin:0">E-workbook</h2><p class="sub" style="margin:4px 0 0">' + md(W.intro) + '</p></div>' +
      '<div class="wb-score"><b>' + sc.score + ' / ' + sc.total + '</b><small>' + sc.checked + ' of ' + sc.tasks + ' tasks checked</small></div></div>' +
      (res ? '<div class="card pad"><p class="note ok" style="margin:0">Sent on ' + ctx.fmtDate(res.sent) + (res.total ? ' · auto score ' + res.score + ' / ' + res.total : '') + '. You can update your written answers and send again.</p>' +
        (res.mark || res.comment ? '<div class="feedback" style="margin-top:10px"><b>Ms. Maria’s feedback' + (res.mark ? ' · written part ' + esc(res.mark) : '') + '</b><br>' + esc(res.comment) + '</div>' : '') + '</div>' : '') +
      '<nav class="wb-toc">' + W.tasks.map(function (t, k) { var d = st.done[t.id]; return '<a href="#" data-jump="wb-' + t.id + '" class="' + (d ? 'on' : '') + '">' + (d ? '✓ ' : '') + 'Task ' + (k + 1) + '</a>'; }).join('') +
      (W.written && W.written.length ? '<a href="#" data-jump="wb-written">Written</a>' : '') + '</nav>' +
      W.tasks.map(function (t, k) { return taskHtml(t, k, st); }).join('') +
      (W.written && W.written.length ? '<section class="card wb-task st-Deliver" id="wb-written"><div class="wb-head"><div><div class="eyebrow muted">Written · marked by Ms. Maria</div><h3 class="h3">Write in your own words</h3></div></div>' +
        W.written.map(function (w) {
          return '<div class="wb-w"><h4>' + esc(w.id) + '. ' + esc(w.title) + (w.slide ? ' <small class="muted">· Slide ' + w.slide + '</small>' : '') + '</h4><p>' + md(w.prompt) + '</p>' +
            (w.frame ? '<p class="wb-frame">' + md(w.frame) + '</p>' : '') + '<textarea class="input" data-w="' + esc(w.id) + '" maxlength="3000">' + esc(st.written[w.id] || '') + '</textarea></div>';
        }).join('') + '</section>' : '') +
      '<div class="card pad wb-send"><div><b>Send to Ms. Maria</b><p class="small muted" style="margin:2px 0 0">Check every task first. Your score and written answers go to the teacher dashboard.</p></div>' +
      '<button class="btn" type="button" id="wbSend">' + (res ? 'Send again' : 'Submit my workbook') + '</button></div></div>';
  }

  function wire(el, n, c, ctx) {
    var st = ctx.draft() || blank();
    function save() { ctx.setDraft(st); }
    function redraw(focusId) { ctx.rerender(focusId); }
    $$('[data-jump]', el).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var t = document.getElementById(a.getAttribute('data-jump')); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
    $$('[data-task]', el).forEach(function (box) {
      var id = box.getAttribute('data-task'), task = c.workbook.tasks.filter(function (t) { return t.id === id; })[0];
      if (!task) return;
      st.sel[id] = st.sel[id] || {};
      $$('.wb-pick', box).forEach(function (b) { b.onclick = function () { st.sel[id][b.getAttribute('data-i')] = b.getAttribute('data-v'); save(); $$('.wb-pick[data-i="' + b.getAttribute('data-i') + '"]', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); }; });
      $$('select[data-i]', box).forEach(function (s) { s.onchange = function () { st.sel[id][s.getAttribute('data-i')] = s.value; save(); }; });
      $$('input[data-i]', box).forEach(function (s) { s.oninput = function () { st.sel[id][s.getAttribute('data-i')] = s.value.trim(); save(); }; });
      $$('[data-add]', box).forEach(function (b) { b.onclick = function () { (st.sel[id].seq = st.sel[id].seq || []).push(Number(b.getAttribute('data-add'))); save(); redraw('wb-' + id); }; });
      var rs = $('[data-reset]', box); if (rs) rs.onclick = function () { st.sel[id].seq = []; save(); redraw('wb-' + id); };
      var ck = $('[data-check]', box);
      if (ck) ck.onclick = function () {
        var sel = st.sel[id], vals;
        if (task.type === 'order') { vals = sel.seq || []; if (vals.length < size(task)) { ctx.toast('Place all ' + size(task) + ' steps first.'); return; } }
        else { vals = task.items.map(function (x, i) { return sel[i] == null ? '' : sel[i]; }); var miss = vals.filter(function (v) { return v === ''; }).length; if (miss) { ctx.toast('Answer every line first (' + miss + ' left).'); return; } }
        st.done[id] = vals.map(function (v, i) { return isRight(task, i, v); });
        save();
        var got = st.done[id].filter(Boolean).length;
        ctx.toast(got === size(task) ? 'All correct!' : got + ' of ' + size(task) + ' correct. Read the answers in red.');
        redraw('wb-' + id);
      };
    });
    $$('[data-w]', el).forEach(function (t) { t.oninput = function () { st.written[t.getAttribute('data-w')] = t.value; save(); }; });
    var send = $('#wbSend', el);
    if (send) send.onclick = function () {
      var sc = score(c, st);
      if (sc.checked < sc.tasks) { ctx.toast('Check all ' + sc.tasks + ' tasks first (' + (sc.tasks - sc.checked) + ' left).'); return; }
      var W = c.workbook.written || [], empty = W.filter(function (w) { return !String(st.written[w.id] || '').trim(); });
      if (empty.length && !confirm('Written answer ' + empty.map(function (w) { return w.id; }).join(', ') + ' is empty. Send anyway?')) return;
      var answers = {};
      c.workbook.tasks.forEach(function (t, k) { var d = st.done[t.id]; answers['Task ' + (k + 1) + ' · ' + t.title] = d.filter(Boolean).length + ' / ' + size(t); });
      W.forEach(function (w) { answers[w.id + ' · ' + w.title] = st.written[w.id] || ''; });
      send.disabled = true; send.textContent = 'Sending…';
      ctx.submit(answers, sc.score, sc.total).then(function () { ctx.toast('Sent to Ms. Maria. Score ' + sc.score + ' / ' + sc.total + '.'); redraw(); },
        function (err) { send.disabled = false; send.textContent = 'Submit my workbook'; ctx.toast(err.message || 'Could not send. Check your connection.'); });
    };
  }

  root.LSCM_WB = { render: render, wire: wire, score: score, isRight: isRight, options: options, size: size };
  if (typeof module !== 'undefined') module.exports = root.LSCM_WB;
})(typeof window !== 'undefined' ? window : globalThis);
