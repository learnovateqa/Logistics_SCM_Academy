/* Logistics & Supply Chain Management Academy · student app
 * Plain JavaScript, no framework. Content comes from levels/<level>/*.json,
 * learner data from the Google Sheet (config.js → scriptUrl).
 */
(function () {
  'use strict';

  var CFG = window.LSCM_CONFIG || {};
  var STAGE_ORDER = ['Plan', 'Source', 'Make', 'Deliver', 'Return'];
  var STAGE_LABEL = { Plan: 'Plan', Source: 'Source', Make: 'Make', Deliver: 'Deliver', Return: 'Return & sustain' };

  // ------------------------------------------------------------ helpers --
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('lscm:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('lscm:' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
    del: function (k) { try { localStorage.removeItem('lscm:' + k); } catch (e) { /* ignore */ } }
  };
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200);
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // icons (stroke icons, 24px)
  var P = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    sessions: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    lab: '<circle cx="5" cy="12" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M7.3 11 16.7 6M7.3 13l9.4 5"/>',
    tools: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M14 10h2M8 14h2M14 14h2M8 18h8"/>',
    progress: '<path d="M3 20h18"/><path d="M6 16v-4M11 16V8M16 16v-6M21 16V5"/>',
    study: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    slides: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    handout: '<path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6M9 13h8M9 17h6"/>',
    workbook: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    terms: '<rect x="3" y="5" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v13"/>',
    exit: '<circle cx="12" cy="12" r="9"/><path d="M12 8l4 4-4 4M8 12h8"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    truck: '<rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 10h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    out: '<path d="M10 17l-5-5 5-5M5 12h11M14 4h5v16h-5"/>',
    install: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 7v7M9 11l3 3 3-3M10 18h4"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    Plan: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    Source: '<path d="M3 9l9-6 9 6v12H3z"/><path d="M9 21v-6h6v6"/>',
    Make: '<path d="M2 20h20V9l-6 4V9l-6 4V4H2z"/>',
    Deliver: '<rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 10h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    Return: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'
  };
  function ico(name, size) {
    var s = size || 20;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  var LOGO = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M4 18 C 9 18, 8 6, 13 6 S 20 12, 20 6" stroke="#fff"/><circle cx="4" cy="18" r="2.2" fill="#00B4B4"/><circle cx="13" cy="6" r="2.2" fill="#8338EC"/><circle cx="20" cy="6" r="2.2" fill="#00B86B"/></svg>';

  // -------------------------------------------------------------- state --
  var S = {
    code: store.get('code', null),
    state: store.get('state', null),   // last answer from the Sheet
    levels: null, course: null, content: {}, // content[n] = session JSON
    p: null                             // local progress for this learner
  };
  function loadLocal() {
    S.p = store.get('p:' + (S.code || 'guest'), null) || { done: [], known: {}, quiz: {}, drafts: {}, quizzes: 0 };
  }
  function saveLocal() { store.set('p:' + (S.code || 'guest'), S.p); queueSync(); }
  loadLocal();

  // ---------------------------------------------------------------- API --
  function api(body) {
    if (!CFG.scriptUrl) return Promise.reject(new Error('The site is not connected to the Sheet yet.'));
    return fetch(CFG.scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Something went wrong.'); return j; });
  }
  var syncTimer = null;
  function queueSync() {
    if (!S.code) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      api({ action: 'saveProgress', code: S.code, data: {
        sessionsDone: S.p.done, cardsKnown: Object.keys(S.p.known).length, quizzesTaken: S.p.quizzes || 0,
        labSteps: 0, best: S.p.quiz
      } }).catch(function () { /* offline: will sync next time */ });
    }, 1500);
  }
  function refreshState() {
    if (!S.code) return Promise.resolve();
    return api({ action: 'state', code: S.code }).then(function (st) {
      S.state = st; store.set('state', st); mergeRemote(st);
    });
  }
  // bring in what this learner saved on another device (sessions done, best quiz scores)
  function mergeRemote(st) {
    var d = st && st.progress; if (!d) return;
    if (Array.isArray(d.sessionsDone)) d.sessionsDone.forEach(function (n) { if (S.p.done.indexOf(n) === -1) S.p.done.push(n); });
    if (d.best) Object.keys(d.best).forEach(function (k) { if (S.p.quiz[k] == null || d.best[k] > S.p.quiz[k]) S.p.quiz[k] = d.best[k]; });
    if (d.quizzesTaken > (S.p.quizzes || 0)) S.p.quizzes = d.quizzesTaken;
    store.set('p:' + S.code, S.p);
  }

  // ------------------------------------------------------------ content --
  function getJSON(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('missing'); return r.json(); }); }
  function levelInfo(id) { return ((S.levels && S.levels.levels) || []).filter(function (l) { return l.id === String(id); })[0]; }
  function loadCourse() {
    var lv = S.state && levelInfo(S.state.student.level);
    if (!lv || !lv.content) { S.course = null; return Promise.resolve(); }
    if (S.course && S.course.level === lv.id) return Promise.resolve();
    return getJSON(lv.path + 'course.json').then(function (c) { c.path = lv.path; S.course = c; S.content = {}; });
  }
  function loadSession(n) {
    if (S.content[n]) return Promise.resolve(S.content[n]);
    var meta = sessionMeta(n);
    if (!meta || !meta.file) return Promise.resolve(null);
    return getJSON(S.course.path + meta.file).then(function (c) { S.content[n] = c; return c; });
  }
  function loadAllContent() {
    if (!S.course) return Promise.resolve();
    return Promise.all(S.course.sessions.filter(function (s) { return s.file; }).map(function (s) { return loadSession(s.n).catch(function () { return null; }); }));
  }
  function sessionMeta(n) { return S.course && S.course.sessions.filter(function (s) { return s.n === Number(n); })[0]; }
  function sheetSession(n) { return S.state && S.state.sessions.filter(function (s) { return s.session === Number(n); })[0]; }
  function isOpen(n) { var s = sheetSession(n); return !!(s && s.status === 'Open'); }
  function isDone(n) { return S.p.done.indexOf(Number(n)) !== -1; }
  function openCount() { return S.state ? S.state.sessions.filter(function (s) { return s.status === 'Open'; }).length : 0; }
  function currentSession() {
    if (!S.course) return null;
    var open = S.course.sessions.filter(function (s) { return isOpen(s.n); });
    var next = open.filter(function (s) { return !isDone(s.n); })[0];
    return next || open[open.length - 1] || null;
  }

  // ------------------------------------------------------------- layout --
  var NAV = [
    { id: 'home', label: 'Home', href: '#/home' },
    { id: 'sessions', label: 'Sessions', href: '#/sessions' },
    { id: 'lab', label: 'My Supply Chain', short: 'My SC', href: '#/lab' },
    { id: 'tools', label: 'Tools', href: '#/tools' },
    { id: 'progress', label: 'Progress', href: '#/progress' },
    { id: 'study', label: 'Study', href: '#/study' }
  ];
  function frame(active) {
    var signed = !!(S.code && S.state);
    var name = signed ? S.state.student.name : '';
    $('#top').innerHTML =
      '<div class="top-in">' +
        '<a class="brand" href="#/home" aria-label="Home"><span class="logo">' + LOGO + '</span>' +
          '<span class="brand-t"><b>' + esc((S.course && S.course.course) || 'Logistics & Supply Chain') + '</b><small>' + esc(CFG.brand || 'Elevate with Ms. Maria') + '</small></span></a>' +
        (signed ? '<form class="top-search" role="search" id="searchForm"><label class="sr" for="q">Search</label>' + ico('search', 18) +
          '<input id="q" type="search" placeholder="Search sessions, terms, tools" autocomplete="off"></form>' : '') +
        '<div class="top-btns">' +
          (signed ? '<button class="ibtn only-phone" id="searchBtn" aria-label="Search">' + ico('search') + '</button>' : '') +
          '<button class="ibtn" id="aaBtn" aria-label="Text size">AA</button>' +
          (signed ? '<button class="avatar" id="meBtn" aria-label="My menu">' + esc(name.trim().charAt(0).toUpperCase() || '?') + '</button>' : '') +
        '</div>' +
      '</div>' +
      (signed ? '<form class="phone-search" id="phoneSearch" role="search"><input type="search" placeholder="Search sessions, terms, tools" aria-label="Search"></form>' : '');

    var side = $('#side'), tabs = $('#tabbar');
    document.body.classList.toggle('out', !signed);
    if (!signed) { side.innerHTML = ''; side.hidden = true; tabs.innerHTML = ''; tabs.hidden = true; return; }
    side.hidden = false; tabs.hidden = false;
    side.innerHTML = NAV.map(function (n) {
      return '<a class="nav' + (active === n.id ? ' on' : '') + '" href="' + n.href + '">' + ico(n.id) + n.label + '</a>';
    }).join('') +
      '<div class="side-h">Your route</div>' + sideRoute() +
      '<div class="side-foot">' + esc(S.state.student.name) + ' · Level ' + esc(S.state.student.level) + (S.state.student.batch ? ' · ' + esc(S.state.student.batch) : '') + '</div>';
    tabs.innerHTML = NAV.slice(0, 5).map(function (n) {
      return '<a class="' + (active === n.id ? 'on' : '') + '" href="' + n.href + '"><span class="tico">' + ico(n.id) + '</span>' + (n.short || n.label) + '</a>';
    }).join('');
  }
  function sideRoute() {
    if (!S.course) return '';
    return '<div class="side-route"><div class="small"><b>' + S.p.done.length + ' of ' + S.course.sessions.length + '</b> sessions done</div><div class="mini">' +
      S.course.sessions.map(function (s) { return '<i class="st-' + s.stage + (isDone(s.n) ? ' done' : '') + '" title="Session ' + s.n + '"></i>'; }).join('') + '</div></div>';
  }
  function wireFrame() {
    var aa = $('#aaBtn');
    if (aa) aa.onclick = function () {
      var n = (Number(store.get('size', 0)) + 1) % 3; store.set('size', n); applySize();
      toast(['Normal text', 'Larger text', 'Largest text'][n]);
    };
    var sf = $('#searchForm');
    if (sf) sf.onsubmit = function (e) { e.preventDefault(); go('#/search/' + encodeURIComponent($('#q').value.trim())); };
    var ps = $('#phoneSearch');
    if (ps) ps.onsubmit = function (e) { e.preventDefault(); go('#/search/' + encodeURIComponent($('input', ps).value.trim())); ps.classList.remove('on'); };
    var sb = $('#searchBtn');
    if (sb) sb.onclick = function () { ps.classList.toggle('on'); if (ps.classList.contains('on')) $('input', ps).focus(); };
    var me = $('#meBtn');
    if (me) me.onclick = openMenu;
  }
  function applySize() { document.documentElement.setAttribute('data-size', String(store.get('size', 0))); }
  function openMenu() {
    var bg = $('#sheetBg'), sh = $('#sheet');
    sh.innerHTML = '<div class="who"><b>' + esc(S.state.student.name) + '</b><br><small>Level ' + esc(S.state.student.level) + ' · code ' + esc(S.state.student.code) + '</small></div>' +
      '<a href="#/study">' + ico('study') + 'Study: flashcards and glossary</a>' +
      '<a href="#/install">' + ico('install') + 'Install the app</a>' +
      '<button id="signOut">' + ico('out') + 'Sign out</button>';
    bg.classList.add('on'); sh.classList.add('on');
    function close() { bg.classList.remove('on'); sh.classList.remove('on'); }
    bg.onclick = close; $$('a', sh).forEach(function (a) { a.addEventListener('click', close); });
    $('#signOut').onclick = function () { close(); signOut(); };
  }
  function signOut() {
    store.del('code'); store.del('state'); S.code = null; S.state = null; S.course = null; S.content = {}; loadLocal();
    go('#/home'); render();
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  // ------------------------------------------------------------- router --
  function route() {
    var parts = (location.hash || '#/home').replace(/^#\/?/, '').split('/');
    return { view: parts[0] || 'home', a: parts[1] ? decodeURIComponent(parts[1]) : '', b: parts[2] || '' };
  }
  function render() {
    var r = route();
    var main = $('#main');
    if (!S.code || !S.state) { frame(null); wireFrame(); main.innerHTML = viewWelcome(); wireWelcome(); window.scrollTo(0, 0); return; }
    var views = { home: viewHome, sessions: viewSessions, session: viewSession, lab: viewLab, tools: viewTools, progress: viewProgress, study: viewStudy, search: viewSearch, install: viewInstall };
    var v = views[r.view] || viewHome;
    var active = r.view === 'session' ? 'sessions' : (r.view === 'search' || r.view === 'install' ? '' : r.view);
    frame(active); wireFrame();
    if (!S.course) { main.innerHTML = viewNoContent(); return; }
    var out = v(r);
    if (out && typeof out.then === 'function') {
      main.innerHTML = '<div class="empty">Loading…</div>';
      out.then(function (html) { main.innerHTML = html; afterRender(r); }, function () { main.innerHTML = '<div class="card pad note err">This page could not be loaded. Check your internet connection and try again.</div>'; });
    } else { main.innerHTML = out; afterRender(r); }
    if (!r.b) window.scrollTo(0, 0);
  }
  function afterRender(r) {
    var w = WIRE[r.view]; if (w) w(r);
    var q = $('#q'); if (q && r.view === 'search') q.value = r.a;
  }
  var WIRE = {};

  // ------------------------------------------------------------ welcome --
  function viewWelcome() {
    var levels = (S.levels && S.levels.levels) || [];
    return '' +
      '<div class="hero"><div class="hero-in"><div>' +
        '<div class="eyebrow">' + esc(CFG.school || 'Learnovate Qatar') + '</div>' +
        '<h1>Logistics &amp; Supply Chain Management</h1>' +
        '<p>Practical frameworks, real cases and decision-making for future supply chain leaders. Explained in plain English.</p>' +
      '</div>' + routeArt() + '</div></div>' +
      '<div class="grid g-home sec">' +
        '<form class="card pad signin" id="signin" novalidate>' +
          '<h2 class="h2">Sign in</h2><p class="sub">Use the access code from Ms. Maria. It opens your own level.</p>' +
          '<label class="field"><span>Access code</span><input class="input code-input" id="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="L6-XXXXX" required></label>' +
          '<div id="signinMsg"></div>' +
          '<button class="btn" type="submit" id="signinBtn">Sign in</button>' +
        '</form>' +
        '<div class="grid">' + levels.map(function (l) {
          return '<div class="card pad"><div class="eyebrow muted">' + esc(l.name) + '</div><h3 style="margin:6px 0 4px">' + esc(l.title) + '</h3>' +
            (l.content ? '<span class="chip gold">Open with your code</span>' : '<span class="chip lock">Coming soon</span>') + '</div>';
        }).join('') + '</div>' +
      '</div>' +
      '<p class="foot">© ' + new Date().getFullYear() + ' ' + esc(CFG.brand || 'Elevate with Ms. Maria') + ' · ' + esc(CFG.school || 'Learnovate Qatar') + '</p>';
  }
  function routeArt() {
    return '<svg viewBox="0 0 340 200" width="300" style="max-width:100%;justify-self:center" role="img" aria-label="Route from Plan to Return and sustain">' +
      '<path d="M20 160 C 80 160, 70 60, 140 60 S 220 140, 260 120 S 320 40, 320 40" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="14" stroke-linecap="round"/>' +
      '<path d="M20 160 C 80 160, 70 60, 140 60" fill="none" stroke="#00B4B4" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M140 60 C 175 60, 190 100, 205 118" fill="none" stroke="#FF5A36" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M205 118 C 220 132, 240 128, 260 120" fill="none" stroke="#8338EC" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M260 120 C 285 110, 300 80, 308 62" fill="none" stroke="#1F7BFF" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M308 62 C 313 50, 318 42, 320 40" fill="none" stroke="#00B86B" stroke-width="6" stroke-linecap="round"/>' +
      '<g fill="#14213D" stroke-width="4"><circle cx="20" cy="160" r="9" stroke="#00B4B4"/><circle cx="140" cy="60" r="9" stroke="#FF5A36"/><circle cx="205" cy="118" r="9" stroke="#8338EC"/><circle cx="260" cy="120" r="9" stroke="#1F7BFF"/><circle cx="320" cy="40" r="11" stroke="#00B86B"/></g>' +
      '<circle cx="320" cy="40" r="4" fill="#FFC300"/></svg>';
  }
  function wireWelcome() {
    var f = $('#signin'); if (!f) return;
    f.onsubmit = function (e) {
      e.preventDefault();
      var code = $('#code').value.trim().toUpperCase(), msg = $('#signinMsg'), btn = $('#signinBtn');
      if (!code) { msg.innerHTML = '<p class="note err">Enter your access code.</p>'; return; }
      btn.disabled = true; btn.textContent = 'Signing in…'; msg.innerHTML = '';
      api({ action: 'login', code: code }).then(function (st) {
        S.code = st.student.code; S.state = st; store.set('code', S.code); store.set('state', st); loadLocal(); mergeRemote(st);
        return loadCourse();
      }).then(function () { go('#/home'); render(); }, function (err) {
        msg.innerHTML = '<p class="note err">' + esc(err.message) + '</p>'; btn.disabled = false; btn.textContent = 'Sign in';
      });
    };
  }
  function viewNoContent() {
    return '<div class="card pad empty">' + ico('flag', 40) + '<h2 class="h2">Welcome, ' + esc(S.state.student.name) + '</h2>' +
      '<p>Your course (Level ' + esc(S.state.student.level) + ') is being prepared. Please check again soon.</p>' +
      '<button class="btn ghost" onclick="location.reload()">Check again</button></div>';
  }

  // --------------------------------------------------------------- home --
  function viewHome() {
    var st = S.state, c = S.course, total = c.sessions.length, open = openCount(), cur = currentSession();
    var pct = Math.round(open / total * 100);
    var anns = st.announcements || [];
    return '' +
      '<div class="hero"><div class="hero-in"><div>' +
        '<div class="eyebrow">Welcome back, ' + esc(st.student.name.split(' ')[0]) + ' · Level ' + esc(st.student.level) + (st.student.batch ? ' · ' + esc(st.student.batch) : '') + '</div>' +
        '<h1>' + esc(c.course) + '</h1><p>' + esc(c.tagline) + '</p>' +
        '<div class="btns">' + (cur ? '<a class="btn light" href="#/session/' + cur.n + '">Continue Session ' + cur.n + '</a>' : '<span class="btn light" aria-disabled="true">Session 1 opens soon</span>') +
          '<a class="btn outline-w" href="#/lab">My Supply Chain</a></div>' +
      '</div><div class="ring" style="--p:' + pct + '"><div><div><b>' + open + '/' + total + '</b><small>sessions open</small></div></div></div></div></div>' +
      installBanner() +
      (anns.length ? '<div class="sec">' + anns.slice(0, 3).map(function (a) {
        return '<div class="card pad ann"><div class="eyebrow">' + ico('bell', 14) + ' Announcement</div><p style="margin:6px 0 2px">' + esc(a.text) + '</p><small>' + fmtDate(a.date) + '</small></div>';
      }).join('') + '</div>' : '') +
      '<div class="sec"><h2>Your course route</h2><p class="sub">A session opens when Ms. Maria opens it. The line changes colour at each stage.</p>' +
        '<div class="card route-h">' + routeH() + '</div></div>' +
      '<div class="grid g-home sec">' + weekCard(cur) + shipmentCard() + '</div>' +
      '<div class="sec"><h2>Five stages</h2><p class="sub">Every session belongs to one stage of the SCOR model.</p><div class="grid g5">' +
        STAGE_ORDER.map(function (k) {
          var ss = c.sessions.filter(function (s) { return s.stage === k; });
          return '<div class="stagecard st-' + k + '"><h3>' + svgStage(k) + esc(STAGE_LABEL[k]) + '</h3><p>' + esc(c.stages[k].blurb) + '</p><div class="chips">' +
            ss.map(function (s) { return '<a class="chip" href="#/session/' + s.n + '">S' + s.n + (s.type === 'Exam' ? ' ★' : '') + '</a>'; }).join('') + '</div></div>';
        }).join('') + '</div></div>' +
      '<div class="sec"><h2>How your studying is going</h2><div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
        stat('Sessions done', S.p.done.length + ' / ' + total, 'Mark a session when you finish it.') +
        stat('Cards known', Object.keys(S.p.known).length, 'Tap a card in Study to start.') +
        stat('Quizzes taken', S.p.quizzes || 0, Object.keys(S.p.quiz).length ? 'Best scores saved.' : 'None yet.') +
        stat('Workbooks sent', Object.keys((st.results && st.results.workbook) || {}).length, 'Sent to Ms. Maria.') +
      '</div></div>' + foot();
  }
  function svgStage(k) { return '<span style="display:inline-grid" class="st-' + k + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--c)" aria-hidden="true">' + P[k] + '</svg></span>'; }
  function stat(label, val, sub) { return '<div class="card stat"><small>' + esc(label) + '</small><b>' + esc(val) + '</b><span>' + esc(sub) + '</span></div>'; }
  function foot() { return '<p class="foot">' + esc(CFG.brand || 'Elevate with Ms. Maria') + ' · ' + esc(CFG.school || 'Learnovate Qatar') + '</p>'; }
  function routeH() {
    var cur = currentSession();
    return '<ol>' + S.course.sessions.map(function (s) {
      var cls = 'st-' + s.stage + (isDone(s.n) ? ' done' : isOpen(s.n) ? ' on' : ' lock') + (cur && cur.n === s.n ? ' now' : '') + (s.type === 'Exam' ? ' exam' : '');
      var inner = isDone(s.n) ? ico('check', 18) : '<span>' + s.n + '</span>';
      return '<li class="' + cls + '"><a href="#/session/' + s.n + '"><div class="pin">' + inner + '</div><small>' + esc(s.short) + '</small></a></li>';
    }).join('') + '</ol>';
  }
  function weekCard(cur) {
    if (!cur) return '<div class="week"><div class="eyebrow">This week</div><h3>Your first session opens soon</h3><p class="muted">Ms. Maria will open Session 1 in class. Then everything for the session appears here.</p></div>';
    return '<div class="week"><div class="eyebrow">This week</div><h3>Session ' + cur.n + ' · ' + esc(cur.title) + '</h3>' +
      '<p class="muted" style="margin:0">' + esc(STAGE_LABEL[cur.stage]) + ' stage</p>' + tiles(cur.n, false) +
      '<a class="btn light" style="margin-top:16px;width:100%" href="#/session/' + cur.n + '">Open Session ' + cur.n + '</a></div>';
  }
  function shipmentCard() {
    var total = S.course.sessions.length, done = S.p.done.length;
    var next = S.course.sessions.filter(function (s) { return !isDone(s.n); })[0];
    return '<div class="card pad"><h3 class="h2" style="font-size:1.1rem">Your shipment</h3><p class="sub">Each finished session moves your shipment along the route.</p>' +
      '<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div class="ring light" style="--p:' + Math.round(done / total * 100) + '"><div><div><b>' + done + '/' + total + '</b><small>stops</small></div></div></div>' +
      '<div><b style="font-size:1.05rem">' + done + ' of ' + total + ' stops reached</b><p class="muted small" style="margin:4px 0 10px">' +
      (next ? 'Next stop: Session ' + next.n + ' · ' + esc(next.title) : 'Delivered! You finished the route.') + '</p>' +
      '<a class="btn ghost" href="#/progress">Track my shipment</a></div></div></div>';
  }
  function installBanner() {
    if (store.get('installHidden', false) || window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return '';
    return '<div class="card install sec noprint" id="installBar"><span class="logo">' + LOGO + '</span><div><b>Install the app</b><p>Opens from your home screen and works offline.</p></div>' +
      '<a class="btn ghost" href="#/install" style="margin-left:auto">Install</a><button class="x" id="hideInstall" aria-label="Hide">' + ico('x') + '</button></div>';
  }
  WIRE.home = function () {
    var h = $('#hideInstall'); if (h) h.onclick = function () { store.set('installHidden', true); $('#installBar').remove(); };
  };

  // ---------------------------------------------------------- sessions --
  function viewSessions() {
    var c = S.course, cur = currentSession(), html = '';
    STAGE_ORDER.forEach(function (k) {
      var ss = c.sessions.filter(function (s) { return s.stage === k; });
      html += '<div class="stage-h st-' + k + '"><i></i>' + esc(STAGE_LABEL[k]) + '</div><ol class="route-v">' + ss.map(function (s) {
        var open = isOpen(s.n), done = isDone(s.n);
        var cls = 'st-' + s.stage + (done ? ' done' : open ? ' on' : ' lock') + (cur && cur.n === s.n ? ' now' : '') + (s.type === 'Exam' ? ' exam' : '');
        var chip = done ? '<span class="chip done">' + ico('check', 14) + ' Done</span>' : open ? '<span class="chip gold">Open now</span>' : '<span class="chip lock">' + ico('lock', 14) + ' Locked</span>';
        return '<li class="' + cls + '"><div class="pin">' + (done ? ico('check', 18) : '<span>' + s.n + '</span>') + '</div>' +
          '<a class="card srow st-' + s.stage + '" href="#/session/' + s.n + '"><div class="meta"><small class="muted">Session ' + s.n + (s.type === 'Exam' ? ' · Exam' : '') + '</small>' + chip + '</div>' +
          '<h3>' + esc(s.title) + '</h3><p>' + esc(s.summary) + '</p></a></li>';
      }).join('') + '</ol>';
    });
    return '<h1 class="h2">Sessions</h1><p class="sub">12 sessions along one route. Sessions open one at a time.</p>' + html + foot();
  }

  // ----------------------------------------------------------- session --
  var TILE_DEFS = [
    { id: 'slides', label: 'Slides', icon: 'slides' },
    { id: 'handout', label: 'Handout', icon: 'handout' },
    { id: 'workbook', label: 'E-workbook', icon: 'workbook' },
    { id: 'quiz', label: 'Practice quiz', icon: 'quiz' },
    { id: 'terms', label: 'Key terms', icon: 'terms' },
    { id: 'exit', label: 'Exit ticket', icon: 'exit' }
  ];
  function tileState(n, id) {
    var r = (S.state && S.state.results) || {}, sheet = sheetSession(n) || {};
    if (id === 'slides') return sheet.canva ? 'Open in Canva' : 'Link coming';
    if (id === 'quiz') { var b = S.p.quiz[n]; return b != null ? 'Best ' + b + '%' : 'Open'; }
    if (id === 'workbook') { var w = r.workbook && r.workbook[n]; return w ? (w.mark ? 'Marked ' + w.mark : 'Sent') : 'Open'; }
    if (id === 'exit') { var x = r.exit && r.exit[n]; return x ? 'Sent' : 'Open'; }
    return 'Open';
  }
  function tiles(n, light, active) {
    var sheet = sheetSession(n) || {};
    return '<div class="tiles' + (light ? ' light' : '') + '">' + TILE_DEFS.map(function (t) {
      var href = t.id === 'slides' ? (sheet.canva || '') : '#/session/' + n + '/' + t.id;
      var ext = t.id === 'slides' && sheet.canva;
      if (t.id === 'slides' && !sheet.canva) href = '#/session/' + n + '/slides';
      return '<a class="tile' + (active === t.id ? ' on' : '') + '" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' +
        '<span class="ti">' + ico(t.icon, 18) + '</span><b>' + t.label + (ext ? ' ' + '<span style="display:inline-block;vertical-align:-2px">' + ico('ext', 13) + '</span>' : '') + '</b><small>' + esc(tileState(n, t.id)) + '</small></a>';
    }).join('') + '</div>';
  }
  function viewSession(r) {
    var n = Number(r.a), meta = sessionMeta(n);
    if (!meta) return '<div class="card pad empty">This session was not found. <a href="#/sessions">See all sessions</a></div>';
    var head = '<div class="card shead st-' + meta.stage + '"><div class="meta" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      '<span class="chip st-' + meta.stage + '"><span class="d"></span>' + esc(STAGE_LABEL[meta.stage]) + '</span><small class="muted">Session ' + n + ' of ' + S.course.sessions.length + '</small>' +
      (isOpen(n) ? (isDone(n) ? '<span class="chip done">' + ico('check', 14) + ' Done</span>' : '<span class="chip gold">Open now</span>') : '<span class="chip lock">' + ico('lock', 14) + ' Locked</span>') + '</div>' +
      '<h1>' + esc(meta.title) + '</h1><p class="muted" style="margin:0">' + esc(meta.summary) + '</p></div>';
    if (!isOpen(n)) {
      return head + '<div class="card locked sec"><div class="big">' + ico('lock', 32) + '</div><h2 class="h2">This session is locked</h2><p class="muted">It opens when Ms. Maria opens it in class.</p><a class="btn ghost" href="#/sessions">See all sessions</a></div>' + foot();
    }
    if (meta.type === 'Exam') {
      return head + '<div class="card pad sec st-' + meta.stage + '"><h2 class="h2">' + esc(meta.title) + '</h2><p>' + esc(meta.summary) + '</p>' +
        '<p class="note">The exam is taken in class. Ms. Maria will tell you the format. A revision page for this exam will appear here.</p>' + doneButton(n) + '</div>' + foot();
    }
    return loadSession(n).then(function (content) {
      var tab = r.b || '';
      var body;
      if (!content) body = '<div class="card pad empty">' + ico('handout', 36) + '<p>The materials for this session are being prepared.</p></div>';
      else if (!tab) body = overview(n, content);
      else body = (PANELS[tab] || overview)(n, content, meta);
      return head + '<div class="sec">' + tiles(n, true, tab) + '</div><div class="panel st-' + meta.stage + '" id="panel">' + body + '</div>' + foot();
    });
  }
  function doneButton(n) {
    return isDone(n) ? '<button class="btn ghost" data-undone="' + n + '">' + ico('check', 18) + ' Finished – tap to undo</button>'
      : '<button class="btn" data-done="' + n + '">' + ico('flag', 18) + ' I finished this session</button>';
  }
  function overview(n, c) {
    return '<div class="card pad"><h2 class="h2" style="font-size:1.15rem;margin-bottom:8px">By the end of this session you can…</h2><ul class="goals">' +
      c.goals.map(function (g) { return '<li>' + md(g) + '</li>'; }).join('') + '</ul>' +
      '<p class="sub" style="margin-top:14px">Start with the handout, then try the practice quiz. Send your e-workbook and exit ticket before the next class.</p>' +
      '<div class="btns"><a class="btn" href="#/session/' + n + '/handout">Read the handout</a>' + doneButton(n) + '</div></div>';
  }
  var PANELS = {
    slides: function (n) {
      return '<div class="card pad"><h2 class="h2" style="font-size:1.1rem">Slides</h2><p class="muted">Ms. Maria will add the link to the slides for this session. Check again after class.</p></div>';
    },
    handout: function (n, c, meta) {
      return '<div class="card handout"><div class="pad panel-h" style="padding-bottom:0"><div><div class="eyebrow muted">Handout · Session ' + n + '</div><h2 class="h2" style="font-size:1.2rem;margin-top:4px">' + esc(meta.title) + '</h2></div>' +
        '<div class="btns"><button class="btn ghost" onclick="window.print()">' + ico('print', 18) + ' Print or save PDF</button></div></div>' +
        '<section><p>' + md(c.handout.intro) + '</p></section>' +
        c.handout.sections.map(function (s) { return '<section><h3>' + esc(s.h) + '</h3>' + s.blocks.map(block).join('') + '</section>'; }).join('') + '</div>';
    },
    terms: function (n, c) {
      return '<div class="card"><div class="pad panel-h" style="padding-bottom:6px"><h2 class="h2" style="font-size:1.15rem">Key terms</h2>' +
        '<a class="btn ghost" href="#/study/' + n + '">Practise with flashcards</a></div>' +
        c.terms.map(function (t) {
          return '<div class="term' + (S.p.known[n + ':' + t.term] ? ' known' : '') + '"><b>' + esc(t.term) + '</b>' + esc(t.meaning) + (t.example ? '<div class="ex">Example: ' + esc(t.example) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
    },
    quiz: function (n, c) {
      return '<form class="card" id="quizForm"><div class="pad panel-h" style="padding-bottom:0"><div><h2 class="h2" style="font-size:1.15rem">Practice quiz</h2><p class="sub" style="margin:0">' + c.quiz.length + ' questions. You can try as many times as you like.</p></div>' +
        (S.p.quiz[n] != null ? '<span class="chip gold">Best ' + S.p.quiz[n] + '%</span>' : '') + '</div>' +
        c.quiz.map(function (q, i) {
          return '<div class="q" data-q="' + i + '"><h4>' + (i + 1) + '. ' + md(q.q) + '</h4>' + q.options.map(function (o, j) {
            return '<label class="opt"><input type="radio" name="q' + i + '" value="' + j + '"><span>' + md(o) + '</span></label>';
          }).join('') + '<div class="why" hidden></div></div>';
        }).join('') +
        '<div class="pad" id="quizEnd"><button class="btn" type="submit">Check my answers</button></div></form>';
    },
    workbook: function (n, c) { return formPanel(n, 'workbook', 'E-workbook', c.workbook.intro, c.workbook.questions); },
    exit: function (n, c) { return formPanel(n, 'exit', 'Exit ticket', 'Two minutes at the end of class. Your answers go to Ms. Maria.', c.exit.questions); }
  };
  function block(b) {
    if (b.p) return '<p>' + md(b.p) + '</p>';
    if (b.list) return '<ul>' + b.list.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>';
    if (b.steps) return '<ol class="steps">' + b.steps.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ol>';
    if (b.callout) return '<div class="callout"><b>' + esc(b.callout.title) + '</b>' + md(b.callout.text) + '</div>';
    if (b.table) return '<div class="tbl"><table><thead><tr>' + b.table.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      b.table.rows.map(function (row) { return '<tr>' + row.map(function (cell, i) { return (i === 0 ? '<th scope="row">' : '<td>') + md(cell) + (i === 0 ? '</th>' : '</td>'); }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    if (b.stages) return '<div class="grid g5" style="margin:0 0 .9em">' + STAGE_ORDER.map(function (k) {
      return '<div class="stagecard st-' + k + '"><h3>' + svgStage(k) + esc(STAGE_LABEL[k]) + '</h3><p style="margin-bottom:0">' + esc(S.course.stages[k].blurb) + '</p></div>';
    }).join('') + '</div>';
    return '';
  }
  function formPanel(n, kind, title, intro, qs) {
    var res = (S.state.results && S.state.results[kind === 'exit' ? 'exit' : 'workbook'] || {})[n];
    var draft = S.p.drafts[kind + n] || {};
    return '<form class="card" id="workForm" data-kind="' + kind + '"><div class="pad" style="padding-bottom:0"><h2 class="h2" style="font-size:1.15rem">' + title + '</h2><p class="sub">' + esc(intro) + '</p>' +
      (res ? '<p class="note ok">Sent on ' + fmtDate(res.sent) + '. You can change your answers and send again.</p>' : '') +
      (res && (res.mark || res.comment) ? '<div class="feedback"><b>Ms. Maria’s feedback' + (res.mark ? ' · ' + esc(res.mark) : '') + '</b><br>' + esc(res.comment) + '</div>' : '') + '</div>' +
      qs.map(function (q, i) {
        var v = draft[q.id] || '';
        var field;
        if (q.kind === 'choice') field = q.options.map(function (o) {
          return '<label class="opt"><input type="radio" name="' + q.id + '" value="' + esc(o) + '"' + (v === o ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
        }).join('');
        else if (q.kind === 'short') field = '<input class="input" name="' + q.id + '" value="' + esc(v) + '">';
        else field = '<textarea class="input" name="' + q.id + '">' + esc(v) + '</textarea>';
        return '<div class="q"><h4>' + (i + 1) + '. ' + md(q.prompt) + '</h4>' + field + (q.hint ? '<p class="hint">' + md(q.hint) + '</p>' : '') + '</div>';
      }).join('') +
      '<div class="pad"><p class="hint" style="margin:0 0 10px">Your answers are saved on this device while you type.</p><button class="btn" type="submit">Send to Ms. Maria</button></div></form>';
  }
  WIRE.session = function (r) {
    var n = Number(r.a);
    $$('[data-done]').forEach(function (b) { b.onclick = function () { if (!isDone(n)) S.p.done.push(n); saveLocal(); toast('Great work! Your shipment moved one stop.'); render(); }; });
    $$('[data-undone]').forEach(function (b) { b.onclick = function () { S.p.done = S.p.done.filter(function (x) { return x !== n; }); saveLocal(); render(); }; });
    var qf = $('#quizForm');
    if (qf) qf.onsubmit = function (e) {
      e.preventDefault();
      var c = S.content[n], right = 0, missing = 0;
      c.quiz.forEach(function (q, i) {
        var box = $('[data-q="' + i + '"]', qf), pick = $('input[name="q' + i + '"]:checked', qf);
        $$('.opt', box).forEach(function (o) { o.classList.remove('right', 'wrong'); });
        if (!pick) { missing++; return; }
        var v = Number(pick.value), ok = v === q.answer; if (ok) right++;
        $$('.opt', box)[q.answer].classList.add('right');
        if (!ok) pick.closest('.opt').classList.add('wrong');
        var why = $('.why', box); why.hidden = false; why.innerHTML = (ok ? '<b>Correct.</b> ' : '<b>Not quite.</b> ') + md(q.why);
      });
      if (missing) { toast('Answer all ' + c.quiz.length + ' questions first (' + missing + ' left).'); return; }
      var pct = Math.round(right / c.quiz.length * 100);
      S.p.quizzes = (S.p.quizzes || 0) + 1;
      if (S.p.quiz[n] == null || pct > S.p.quiz[n]) S.p.quiz[n] = pct;
      saveLocal();
      $('#quizEnd').innerHTML = '<div class="score"><span class="big">' + right + '/' + c.quiz.length + '</span><div><b>' + pct + '%</b><br><span class="muted small">' +
        (pct >= 80 ? 'Excellent!' : pct >= 60 ? 'Good. Read the explanations and try again.' : 'Read the handout again, then try once more.') + '</span></div></div>' +
        '<div class="btns" style="margin-top:12px"><button class="btn ghost" type="button" id="again">Try again</button><a class="btn ghost" href="#/session/' + n + '/handout">Back to the handout</a></div>';
      $('#again').onclick = function () { render(); };
      api({ action: 'submitQuiz', code: S.code, session: n, score: right, total: c.quiz.length }).catch(function () { toast('Saved on this device. It will not reach the Sheet while offline.'); });
      $('#quizEnd').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    var wf = $('#workForm');
    if (wf) {
      var kind = wf.getAttribute('data-kind');
      var collect = function () { var o = {}; $$('input, textarea', wf).forEach(function (el) { if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = el.value; }); return o; };
      wf.addEventListener('input', function () { S.p.drafts[kind + n] = collect(); store.set('p:' + S.code, S.p); });
      wf.onsubmit = function (e) {
        e.preventDefault();
        var ans = collect(), filled = Object.keys(ans).filter(function (k) { return String(ans[k]).trim(); }).length;
        if (!filled) { toast('Write at least one answer first.'); return; }
        var btn = $('button[type="submit"]', wf); btn.disabled = true; btn.textContent = 'Sending…';
        api({ action: kind === 'exit' ? 'submitExit' : 'submitWorkbook', code: S.code, session: n, answers: ans }).then(function () {
          return refreshState();
        }).then(function () { toast('Sent to Ms. Maria. Thank you!'); render(); }, function (err) {
          btn.disabled = false; btn.textContent = 'Send to Ms. Maria'; toast(err.message || 'Could not send. Check your connection.');
        });
      };
    }
  };

  // ----------------------------------------------------------- progress --
  function viewProgress() {
    var c = S.course, done = S.p.done.length, total = c.sessions.length;
    var lastDone = c.sessions.filter(function (s) { return isDone(s.n); }).pop();
    var res = S.state.results || {};
    var list = '<ol class="route-v">' + c.sessions.map(function (s) {
      var d = isDone(s.n), here = lastDone && lastDone.n === s.n;
      var cls = 'st-' + s.stage + (d ? ' done' : isOpen(s.n) ? ' on' : ' lock') + (s.type === 'Exam' ? ' exam' : '');
      var q = S.p.quiz[s.n], w = res.workbook && res.workbook[s.n];
      return '<li class="' + cls + '">' + (here ? '<div class="truck" title="Your shipment">' + ico('truck', 24) + '</div>' : '<div class="pin">' + (d ? ico('check', 18) : '<span>' + s.n + '</span>') + '</div>') +
        '<div class="card srow st-' + s.stage + '" style="padding:10px 14px"><div class="meta"><small class="muted">Session ' + s.n + ' · ' + esc(STAGE_LABEL[s.stage]) + '</small>' +
        (q != null ? '<span class="chip gold">Quiz ' + q + '%</span>' : '') + (w ? '<span class="chip">' + (w.mark ? 'Workbook ' + esc(w.mark) : 'Workbook sent') + '</span>' : '') + '</div>' +
        '<h3 style="margin:2px 0 0">' + esc(s.title) + '</h3></div></li>';
    }).join('') + '</ol>';
    return '<h1 class="h2">Progress</h1><p class="sub">Your shipment moves one stop each time you finish a session.</p>' +
      '<div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
        stat('Stops reached', done + ' / ' + total, done === total ? 'Delivered!' : 'Keep going.') +
        stat('Average quiz', avgQuiz(), 'Best score per session.') +
        stat('Workbooks sent', Object.keys(res.workbook || {}).length, 'Sent to Ms. Maria.') +
        stat('Cards known', Object.keys(S.p.known).length, 'From Study.') +
      '</div><div class="sec">' + (done ? '' : '<p class="note" style="margin-bottom:14px">Your shipment is waiting at the start. Finish Session 1 to move it.</p>') + list + '</div>' + foot();
  }
  function avgQuiz() { var v = Object.keys(S.p.quiz).map(function (k) { return S.p.quiz[k]; }); return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length) + '%' : '–'; }

  // -------------------------------------------------------------- study --
  function viewStudy(r) {
    return loadAllContent().then(function () {
      var avail = S.course.sessions.filter(function (s) { return S.content[s.n] && isOpen(s.n); });
      if (!avail.length) return '<h1 class="h2">Study</h1><div class="card pad empty sec">' + ico('study', 36) + '<p>Flashcards appear here when your first session opens.</p></div>' + foot();
      var n = Number(r.a) || avail[avail.length - 1].n;
      if (!S.content[n] || !isOpen(n)) n = avail[avail.length - 1].n;
      var meta = sessionMeta(n);
      return '<h1 class="h2">Study</h1><p class="sub">Flashcards for each session, and a glossary of every key term.</p>' +
        '<div class="card pad st-' + meta.stage + '"><div class="panel-h"><label class="field" style="margin:0;min-width:240px"><span class="sr">Session</span><select class="input" id="studySel">' +
        avail.map(function (s) { return '<option value="' + s.n + '"' + (s.n === n ? ' selected' : '') + '>Session ' + s.n + ' · ' + esc(s.title) + '</option>'; }).join('') +
        '</select></label><span class="chip" id="knownCount"></span></div><div id="flashBox"></div></div>' +
        '<div class="sec"><h2>Glossary</h2><p class="sub">All key terms from open sessions, A to Z.</p><input class="input" id="glossQ" placeholder="Filter the glossary" style="max-width:420px;margin-bottom:12px"><div class="card" id="gloss"></div></div>' + foot();
    });
  }
  WIRE.study = function (r) {
    var sel = $('#studySel'); if (!sel) return;
    sel.onchange = function () { go('#/study/' + sel.value); };
    var n = Number(sel.value), terms = S.content[n].terms, meta = sessionMeta(n), i = 0;
    function draw() {
      var t = terms[i], k = n + ':' + t.term, known = !!S.p.known[k];
      $('#knownCount').textContent = terms.filter(function (x) { return S.p.known[n + ':' + x.term]; }).length + ' of ' + terms.length + ' known';
      $('#flashBox').innerHTML = '<div class="flash st-' + meta.stage + '" id="flash"><div class="flash-in" tabindex="0" role="button" aria-label="Flip card">' +
        '<div class="face"><small class="muted">Card ' + (i + 1) + ' of ' + terms.length + '</small><h3>' + esc(t.term) + '</h3><small class="muted">Tap to see the meaning</small></div>' +
        '<div class="face back"><p style="font-size:1.05rem;margin:0 0 8px">' + esc(t.meaning) + '</p>' + (t.example ? '<small class="muted">Example: ' + esc(t.example) + '</small>' : '') + '</div></div></div>' +
        '<div class="flash-nav"><button class="btn ghost" id="prev">Back</button><button class="btn' + (known ? ' ghost' : '') + '" id="know">' + (known ? ico('check', 18) + ' I know it' : 'I know it') + '</button><button class="btn ghost" id="next">Next</button></div>';
      var f = $('#flash'), fi = $('.flash-in', f);
      fi.onclick = function () { f.classList.toggle('flip'); };
      fi.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.classList.toggle('flip'); } };
      $('#prev').onclick = function () { i = (i - 1 + terms.length) % terms.length; draw(); };
      $('#next').onclick = function () { i = (i + 1) % terms.length; draw(); };
      $('#know').onclick = function () { if (known) delete S.p.known[k]; else S.p.known[k] = 1; saveLocal(); if (!known) i = (i + 1) % terms.length; draw(); };
    }
    draw();
    var all = [];
    S.course.sessions.forEach(function (s) { if (S.content[s.n] && isOpen(s.n)) S.content[s.n].terms.forEach(function (t) { all.push({ t: t, n: s.n }); }); });
    all.sort(function (a, b) { return a.t.term.localeCompare(b.t.term); });
    function gloss() {
      var q = $('#glossQ').value.trim().toLowerCase();
      var list = all.filter(function (x) { return !q || (x.t.term + ' ' + x.t.meaning).toLowerCase().indexOf(q) !== -1; });
      $('#gloss').innerHTML = list.length ? list.map(function (x) { return '<div class="term"><b>' + esc(x.t.term) + '</b>' + esc(x.t.meaning) + '<div class="ex">Session ' + x.n + '</div></div>'; }).join('') : '<div class="empty">No terms match.</div>';
    }
    $('#glossQ').oninput = gloss; gloss();
  };

  // ------------------------------------------------------- lab & tools --
  function viewLab() {
    return '<h1 class="h2">My Supply Chain</h1><p class="sub">Run your own Qatar company through the whole course.</p>' +
      '<div class="card pad st-Make" style="border-left:8px solid var(--c)"><h2 class="h2" style="font-size:1.15rem">Coming soon</h2><p>Here you will choose a company (a food importer, a pharmacy distributor, an online shop or a building-materials supplier) and apply each session’s tools to it.</p>' +
      '<ul class="goals"><li>A supply chain map that grows each session</li><li>One lab step per teaching session</li><li>Your Control Tower: live figures for your company</li><li>Simulations: Multi-Tier Flow (bullwhip), Supplier Risk Matrix, Working Capital Balancer, Disruption Shock Test</li></ul></div>' + foot();
  }
  var TOOLS = ['EOQ calculator', 'Reorder point', 'Safety stock', 'Inventory turnover and days of stock', 'ABC analysis', 'Supplier scoring matrix', 'Total cost of ownership', 'Landed cost', 'Forecasting and forecast error', 'Transport cost per delivery', 'OTIF and order accuracy', 'Risk score'];
  function viewTools() {
    return '<h1 class="h2">Tools</h1><p class="sub">Supply chain calculators that show the working step by step.</p>' +
      '<div class="grid g3">' + TOOLS.map(function (t, i) {
        var k = STAGE_ORDER[i % 5];
        return '<div class="card pad st-' + k + '" style="border-top:6px solid var(--c)"><b>' + esc(t) + '</b><p class="muted small" style="margin:4px 0 0">Coming soon</p></div>';
      }).join('') + '</div>' + foot();
  }

  // ------------------------------------------------------------- search --
  function viewSearch(r) {
    var q = (r.a || '').trim().toLowerCase();
    return loadAllContent().then(function () {
      if (!q) return '<h1 class="h2">Search</h1><p class="sub">Type a word in the search box.</p>';
      var hits = [];
      function has(s) { return String(s || '').toLowerCase().indexOf(q) !== -1; }
      S.course.sessions.forEach(function (s) {
        if (has(s.title) || has(s.summary)) hits.push({ href: '#/session/' + s.n, title: 'Session ' + s.n + ' · ' + s.title, sub: s.summary, kind: 'Session' });
        var c = S.content[s.n];
        if (c && isOpen(s.n)) {
          c.terms.forEach(function (t) { if (has(t.term) || has(t.meaning)) hits.push({ href: '#/session/' + s.n + '/terms', title: t.term, sub: t.meaning, kind: 'Key term · Session ' + s.n }); });
          c.handout.sections.forEach(function (h) { if (has(h.h) || has(JSON.stringify(h.blocks))) hits.push({ href: '#/session/' + s.n + '/handout', title: h.h, sub: 'Handout · ' + s.title, kind: 'Handout · Session ' + s.n }); });
        }
      });
      TOOLS.forEach(function (t) { if (has(t)) hits.push({ href: '#/tools', title: t, sub: 'Calculator', kind: 'Tool' }); });
      function hl(s) { var e = esc(s), i = e.toLowerCase().indexOf(esc(q)); return i === -1 ? e : e.slice(0, i) + '<mark>' + e.slice(i, i + esc(q).length) + '</mark>' + e.slice(i + esc(q).length); }
      return '<h1 class="h2">Search</h1><p class="sub">' + hits.length + ' result' + (hits.length === 1 ? '' : 's') + ' for “' + esc(r.a) + '”</p>' +
        (hits.length ? '<div class="card">' + hits.slice(0, 60).map(function (h) { return '<a class="res" href="' + h.href + '"><small>' + esc(h.kind) + '</small><b>' + hl(h.title) + '</b><small>' + hl(h.sub) + '</small></a>'; }).join('') + '</div>'
          : '<div class="card pad empty">No results. Try a shorter word, for example “stock” or “SCOR”.</div>') + foot();
    });
  }

  // ------------------------------------------------------------ install --
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; });
  function viewInstall() {
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return '<h1 class="h2">Install the app</h1><p class="sub">Put the course on your home screen. It opens like an app and works offline.</p><div class="grid g2">' +
      '<div class="card pad"><h3>iPhone and iPad (Safari)</h3><ol class="steps st-Deliver" style="padding:0"><li>Tap the <b>Share</b> button (square with an arrow).</li><li>Tap <b>Add to Home Screen</b>.</li><li>Tap <b>Add</b>.</li></ol></div>' +
      '<div class="card pad"><h3>Android, laptop and desktop (Chrome or Edge)</h3>' +
        (deferredPrompt ? '<p>Your browser can install it now.</p><button class="btn" id="doInstall">' + ico('install', 18) + ' Install</button>'
          : '<ol class="steps st-Plan" style="padding:0"><li>Open the browser menu (⋮).</li><li>Choose <b>Install app</b> or <b>Add to Home screen</b>.</li></ol>') + '</div>' +
      '</div>' + (ios ? '<p class="note sec">You are on an Apple device: use the Safari steps.</p>' : '') + foot();
  }
  WIRE.install = function () {
    var b = $('#doInstall'); if (b) b.onclick = function () { deferredPrompt.prompt(); deferredPrompt.userChoice.then(function () { deferredPrompt = null; render(); }); };
  };

  // --------------------------------------------------------------- boot --
  applySize();
  window.addEventListener('hashchange', render);
  getJSON('levels/levels.json').then(function (l) { S.levels = l; }, function () { S.levels = { levels: [] }; }).then(function () {
    if (!S.code) return;
    return loadCourse().catch(function () {});
  }).then(function () {
    render();
    if (S.code) {
      refreshState().then(loadCourse).then(render, function (err) {
        if (/not found|not active|not open yet/i.test(err.message)) { toast(err.message); signOut(); }
        // otherwise offline: keep the saved copy
      });
    }
  });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
