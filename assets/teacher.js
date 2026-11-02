/* Teacher portal · Logistics & Supply Chain Management
 * Works with the same Apps Script as the student app. All teacher actions are
 * checked on the server against the teacher code in the Settings tab.
 */
(function () {
  'use strict';
  var CFG = window.LSCM_CONFIG || {};
  var ART = window.LSCM_ART || { logo: '', empty: function () { return ''; } };
  var STAGE_LABEL = { Plan: 'Plan', Source: 'Source', Make: 'Make', Deliver: 'Deliver', Return: 'Return & sustain' };

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('lscm-t:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('lscm-t:' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    del: function (k) { try { localStorage.removeItem('lscm-t:' + k); } catch (e) { /* ignore */ } }
  };
  var sess = {
    get: function () { try { return sessionStorage.getItem('lscm-t:code'); } catch (e) { return null; } },
    set: function (v) { try { sessionStorage.setItem('lscm-t:code', v); } catch (e) { /* ignore */ } },
    del: function () { try { sessionStorage.removeItem('lscm-t:code'); } catch (e) { /* ignore */ } }
  };
  function toast(msg) { var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3000); }
  function fmtDate(iso, withTime) {
    if (!iso) return '–'; var d = new Date(iso); if (isNaN(d)) return '–';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + (withTime ? ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
  }
  var P = {
    overview: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    sessions: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    announce: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
    learners: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 5.5 5"/>',
    scores: '<path d="M3 20h18"/><path d="M6 16v-4M11 16V8M16 16v-6M21 16V5"/>',
    marking: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>',
    progress: '<rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 10h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    out: '<path d="M10 17l-5-5 5-5M5 12h11M14 4h5v16h-5"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v6H4V6h6"/>',
    check: '<path d="m5 12 5 5 9-10"/>'
  };
  function ico(n, s) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || '') + '</svg>'; }

  // -------------------------------------------------------------- state --
  var T = {
    code: sess.get() || store.get('code', null),
    level: store.get('level', null),
    levels: [], course: null, content: {}, data: {}, levelInfo: null,
    sel: null // selected submission in Marking
  };

  function api(body) {
    if (!CFG.scriptUrl) return Promise.reject(new Error('The site is not connected to the Sheet (config.js).'));
    body.teacherCode = T.code;
    return fetch(CFG.scriptUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Something went wrong.'); return j; });
  }
  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('missing'); return r.json(); }); }

  function loadLevel() {
    var lv = T.level;
    T.data = {}; T.course = null; T.content = {}; T.sel = null;
    var info = (T.siteLevels || []).filter(function (l) { return l.id === lv; })[0];
    var courseP = info && info.content ? getJSON(info.path + 'course.json').then(function (c) {
      T.course = c; c.path = info.path;
      return Promise.all(c.sessions.filter(function (s) { return s.file; }).map(function (s) {
        return getJSON(info.path + s.file).then(function (x) { T.content[s.n] = x; }, function () {});
      }));
    }, function () {}) : Promise.resolve();
    return Promise.all([
      api({ action: 'tOverview', level: lv }).then(function (o) { T.data.overview = o; }),
      api({ action: 'tList', level: lv, tab: 'Quiz_Scores' }).then(function (r) { T.data.quiz = r.rows; }),
      api({ action: 'tList', level: lv, tab: 'Workbook' }).then(function (r) { T.data.Workbook = r.rows; }),
      api({ action: 'tList', level: lv, tab: 'Exit_Tickets' }).then(function (r) { T.data.Exit_Tickets = r.rows; }),
      api({ action: 'tList', level: lv, tab: 'Lab' }).then(function (r) { T.data.Lab = r.rows; }),
      api({ action: 'tList', level: lv, tab: 'Progress' }).then(function (r) { T.data.progress = r.rows; }),
      courseP
    ]);
  }

  // ------------------------------------------------------------- layout --
  var NAV = [
    { id: 'overview', label: 'Overview' }, { id: 'sessions', label: 'Sessions' }, { id: 'announce', label: 'Announcements' },
    { id: 'learners', label: 'Learners' }, { id: 'scores', label: 'Scores' }, { id: 'marking', label: 'Marking' }, { id: 'progress', label: 'Progress' }
  ];
  function view() { var v = (location.hash || '#/overview').replace(/^#\/?/, '').split('/')[0]; return NAV.some(function (n) { return n.id === v; }) ? v : 'overview'; }

  function frame() {
    var signed = !!(T.code && T.levelInfo);
    document.body.classList.toggle('out', !signed);
    var lvSel = signed ? '<label class="sr" for="lvSel">Level</label><select id="lvSel" class="lv-sel">' + T.levelInfo.levels.map(function (l) {
      return '<option value="' + l.level + '"' + (l.level === T.level ? ' selected' : '') + '>' + esc(l.name) + (l.status === 'Live' ? '' : ' · coming soon') + '</option>';
    }).join('') + '</select>' : '';
    $('#top').innerHTML = '<div class="top-in"><a class="brand" href="#/overview"><span class="logo">' + ART.logo + '</span><span class="brand-t"><b>Teacher portal</b><small>' + esc(CFG.brand || 'Elevate with Ms. Maria') + '</small></span></a>' +
      '<div class="top-btns">' + lvSel + (signed ? '<button class="ibtn" id="refresh" aria-label="Refresh">' + ico('refresh') + '</button><button class="ibtn" id="signOut" aria-label="Sign out">' + ico('out') + '</button>' : '') + '</div></div>';
    var side = $('#side'), ph = $('#tnavPhone'), v = view();
    if (!signed) { side.hidden = true; ph.hidden = true; return; }
    side.hidden = false; ph.hidden = false;
    var badge = toMark();
    side.innerHTML = NAV.map(function (n) {
      return '<a class="nav' + (v === n.id ? ' on' : '') + '" href="#/' + n.id + '"><span class="nico">' + ico(n.id, 18) + '</span>' + n.label + (n.id === 'marking' && badge ? '<span class="count">' + badge + '</span>' : '') + '</a>';
    }).join('') + '<div class="side-foot"><a href="index.html">Open the student site ' + ico('ext', 14) + '</a></div>';
    ph.innerHTML = NAV.map(function (n) { return '<a class="' + (v === n.id ? 'on' : '') + '" href="#/' + n.id + '">' + n.label + (n.id === 'marking' && badge ? ' <span class="count">' + badge + '</span>' : '') + '</a>'; }).join('');
    $('#lvSel').onchange = function () { T.level = this.value; store.set('level', T.level); boot(); };
    $('#refresh').onclick = function () { boot(true); };
    $('#signOut').onclick = function () { sess.del(); store.del('code'); T.code = null; T.levelInfo = null; render(); };
  }
  function toMark() {
    var c = T.data.overview && T.data.overview.counts; if (!c) return 0;
    return (c.workbooksToMark || 0) + (c.exitToMark || 0) + (c.labToMark || 0);
  }

  function render() {
    frame();
    var main = $('#main');
    if (!T.code || !T.levelInfo) { main.innerHTML = signInView(); wireSignIn(); return; }
    if (!T.data.overview) { main.innerHTML = '<div class="empty">Loading…</div>'; return; }
    var v = view();
    main.innerHTML = VIEWS[v]();
    if (WIRE[v]) WIRE[v]();
  }
  window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });

  // ------------------------------------------------------------ sign in --
  function signInView() {
    return '<div class="t-signin card pad"><div class="eyebrow muted">Teacher portal</div><h1 class="h2" style="margin:6px 0 4px">Sign in</h1>' +
      '<p class="sub">Use the teacher code from the <b>Settings</b> tab of your Google Sheet.</p>' +
      '<form id="tsign"><label class="field"><span>Teacher code</span><input class="input code-input" id="tcode" type="password" autocomplete="current-password" required></label>' +
      '<label class="check"><input type="checkbox" id="remember"> Remember on this device</label><div id="tmsg"></div>' +
      '<button class="btn" id="tbtn" type="submit">Sign in</button></form>' +
      '<p class="small muted" style="margin-top:14px">Only use “remember” on your own MacBook or iPad.</p></div>';
  }
  function wireSignIn() {
    $('#tsign').onsubmit = function (e) {
      e.preventDefault();
      var code = $('#tcode').value.trim(), btn = $('#tbtn');
      if (!code) return;
      btn.disabled = true; btn.textContent = 'Signing in…';
      T.code = code;
      api({ action: 'tLogin' }).then(function (r) {
        sess.set(code); if ($('#remember').checked) store.set('code', code);
        T.levelInfo = r; boot();
      }, function (err) {
        T.code = null; btn.disabled = false; btn.textContent = 'Sign in';
        $('#tmsg').innerHTML = '<p class="note err">' + esc(err.message) + '</p>';
      });
    };
  }

  // --------------------------------------------------------------- views --
  var VIEWS = {}, WIRE = {};
  function head(title, sub, right) {
    var lv = T.levelInfo.levels.filter(function (l) { return l.level === T.level; })[0] || {};
    return '<div class="t-head"><div><div class="eyebrow muted">' + esc(lv.name || '') + (lv.status && lv.status !== 'Live' ? ' · coming soon' : '') + '</div><h1 class="h2">' + esc(title) + '</h1>' + (sub ? '<p class="sub">' + sub + '</p>' : '') + '</div>' + (right || '') + '</div>';
  }
  function students() { return (T.data.overview.students || []).slice().sort(function (a, b) { return a.name.localeCompare(b.name); }); }
  function sessions() { return T.data.overview.sessions || []; }
  function progressOf(code) { return (T.data.progress || []).filter(function (p) { return String(p.Code).toUpperCase() === code.toUpperCase(); })[0]; }

  VIEWS.overview = function () {
    var c = T.data.overview.counts, open = sessions().filter(function (s) { return s.status === 'Open'; });
    var lv = T.levelInfo.levels.filter(function (l) { return l.level === T.level; })[0];
    var next = sessions().filter(function (s) { return s.status !== 'Open'; })[0];
    return head('Overview', 'Today at a glance.') +
      '<div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">' +
        tstat('Plan', 'Learners', c.learners, 'active codes') +
        tstat('Source', 'Active this week', c.activeThisWeek, 'opened the site') +
        tstat('Make', 'Quizzes taken', c.quizzes, 'all attempts') +
        tstat('Return', 'To mark', c.workbooksToMark + c.exitToMark + c.labToMark, c.workbooksToMark + ' workbooks · ' + c.exitToMark + ' exit tickets · ' + c.labToMark + ' lab') +
      '</div>' +
      '<div class="grid g2 sec">' +
        '<div class="card pad"><h2 class="h3">Sessions</h2><p class="muted small">' + open.length + ' of ' + sessions().length + ' open.' + (next ? ' Next to open: <b>Session ' + next.session + ' · ' + esc(next.title) + '</b>' : '') + '</p>' +
          (next ? '<button class="btn" data-open="' + next.session + '">Open Session ' + next.session + ' now</button> ' : '') + '<a class="btn ghost" href="#/sessions">All sessions</a></div>' +
        '<div class="card pad"><h2 class="h3">Quick actions</h2><div class="btns"><a class="btn ghost" href="#/announce">Post an announcement</a><a class="btn ghost" href="#/learners">Add a learner</a><a class="btn ghost" href="#/marking">Mark work</a></div></div>' +
      '</div>' +
      '<div class="card pad sec"><h2 class="h3">Levels</h2><p class="muted small">A level must be <b>Live</b> before its learners can sign in. Switch a level on only when its content is on the site.</p><div class="lv-list">' +
        T.levelInfo.levels.map(function (l) {
          return '<div class="lv-row"><b>' + esc(l.name) + '</b><span class="chip' + (l.status === 'Live' ? ' gold' : '') + '">' + esc(l.status) + '</span>' +
            '<button class="btn ghost sm" data-level="' + l.level + '" data-to="' + (l.status === 'Live' ? 'Coming soon' : 'Live') + '">' + (l.status === 'Live' ? 'Set to Coming soon' : 'Set to Live') + '</button></div>';
        }).join('') + '</div></div>';
  };
  function tstat(stage, label, val, sub) { return '<div class="card stat st-' + stage + '"><small>' + esc(label) + '</small><b>' + esc(val) + '</b><span>' + esc(sub) + '</span></div>'; }
  WIRE.overview = function () {
    $$('[data-open]').forEach(function (b) { b.onclick = function () { setSession(+b.getAttribute('data-open'), { status: 'Open' }, b); }; });
    $$('[data-level]').forEach(function (b) {
      b.onclick = function () {
        var to = b.getAttribute('data-to');
        if (to === 'Live' && !confirm('Learners of this level will be able to sign in. Is its content ready on the site?')) return;
        b.disabled = true;
        api({ action: 'tSetLevel', level: b.getAttribute('data-level'), status: to }).then(function (r) {
          T.levelInfo.levels = r.levels; toast('Level updated.'); render();
        }, function (e) { b.disabled = false; toast(e.message); });
      };
    });
  };

  // sessions -------------------------------------------------------------
  VIEWS.sessions = function () {
    return head('Sessions', 'Learners only see open sessions. Paste the Canva share link so the Slides button works.') +
      '<div class="t-list">' + sessions().map(function (s) {
        var open = s.status === 'Open';
        return '<div class="card t-sess st-' + s.stage + '"><div class="t-sess-main"><div class="t-sess-h"><span class="chip st-' + s.stage + '"><span class="d"></span>' + esc(STAGE_LABEL[s.stage] || s.stage) + '</span>' +
          '<small class="muted">Session ' + s.session + (s.type === 'Exam' ? ' · Exam' : '') + (s.openedOn ? ' · opened ' + fmtDate(s.openedOn) : '') + '</small></div>' +
          '<h3>' + esc(s.title) + '</h3>' +
          '<div class="t-links"><label><span>Canva link</span><input class="input sm" data-canva="' + s.session + '" value="' + esc(s.canva) + '" placeholder="https://www.canva.com/design/…" inputmode="url"></label>' +
          '<label><span>Handout link (optional)</span><input class="input sm" data-handout="' + s.session + '" value="' + esc(s.handout) + '" placeholder="https://…" inputmode="url"></label>' +
          '<button class="btn ghost sm" data-save="' + s.session + '">Save links</button></div></div>' +
          '<button class="switch' + (open ? ' on' : '') + '" role="switch" aria-checked="' + open + '" data-toggle="' + s.session + '"><span class="knob"></span><span class="lbl">' + (open ? 'Open' : 'Closed') + '</span></button></div>';
      }).join('') + '</div>';
  };
  function setSession(n, patch, btn) {
    if (btn) btn.disabled = true;
    return api(Object.assign({ action: 'tSetSession', level: T.level, session: n }, patch)).then(function (r) {
      T.data.overview.sessions = r.sessions; toast('Session ' + n + ' saved.'); render();
    }, function (e) { if (btn) btn.disabled = false; toast(e.message); });
  }
  WIRE.sessions = function () {
    $$('[data-toggle]').forEach(function (b) {
      b.onclick = function () { var n = +b.getAttribute('data-toggle'); setSession(n, { status: b.classList.contains('on') ? 'Closed' : 'Open' }, b); };
    });
    $$('[data-save]').forEach(function (b) {
      b.onclick = function () {
        var n = b.getAttribute('data-save');
        setSession(+n, { canva: $('[data-canva="' + n + '"]').value.trim(), handout: $('[data-handout="' + n + '"]').value.trim() }, b);
      };
    });
  };

  // announcements -------------------------------------------------------
  VIEWS.announce = function () {
    var list = T.data.overview.announcements || [];
    return head('Announcements', 'Shown at the top of every learner’s Home page in this level.') +
      '<form class="card pad" id="annForm"><label class="field"><span>New announcement</span><textarea class="input" id="annText" maxlength="1000" placeholder="Example: Session 3 is open. Please read the handout before Thursday."></textarea></label>' +
      '<button class="btn" type="submit">Post</button></form>' +
      '<div class="sec">' + (list.length ? list.map(function (a) {
        return '<div class="card pad ann' + (a.show ? '' : ' hidden-ann') + '"><div class="t-ann-h"><small class="muted">' + fmtDate(a.date, true) + (a.show ? '' : ' · hidden') + '</small>' +
          '<button class="btn ghost sm" data-ann="' + esc(a.id) + '" data-show="' + (a.show ? 0 : 1) + '">' + (a.show ? 'Hide' : 'Show again') + '</button></div><p style="margin:6px 0 0">' + esc(a.text) + '</p></div>';
      }).join('') : '<div class="card pad empty">No announcements yet.</div>') + '</div>';
  };
  WIRE.announce = function () {
    $('#annForm').onsubmit = function (e) {
      e.preventDefault(); var t = $('#annText').value.trim(); if (!t) return;
      var b = $('button', this); b.disabled = true;
      api({ action: 'tAnnounce', level: T.level, text: t }).then(refreshOverview).then(function () { toast('Posted.'); render(); }, function (err) { b.disabled = false; toast(err.message); });
    };
    $$('[data-ann]').forEach(function (b) {
      b.onclick = function () {
        b.disabled = true;
        api({ action: 'tShowAnnouncement', id: b.getAttribute('data-ann'), show: b.getAttribute('data-show') === '1' }).then(refreshOverview).then(render, function (err) { b.disabled = false; toast(err.message); });
      };
    });
  };
  function refreshOverview() { return api({ action: 'tOverview', level: T.level }).then(function (o) { T.data.overview = o; }); }

  // learners ------------------------------------------------------------
  VIEWS.learners = function () {
    var st = students();
    return head('Learners', st.length + ' learner' + (st.length === 1 ? '' : 's') + ' in this level. Give each learner their own code.',
        '<button class="btn ghost" id="copyAll">' + ico('copy', 18) + ' Copy list</button>') +
      '<form class="card pad t-add" id="addForm"><label class="field"><span>Name</span><input class="input" id="newName" required maxlength="80" placeholder="Full name"></label>' +
      '<label class="field"><span>Batch</span><input class="input" id="newBatch" maxlength="40" placeholder="' + esc(T.levelInfo.batch || 'Batch 1') + '"></label>' +
      '<button class="btn" type="submit">Add learner</button></form><div id="newCode"></div>' +
      '<div class="card sec t-table"><table><thead><tr><th>Name</th><th>Code</th><th>Batch</th><th>Sessions done</th><th>Last visit</th><th>Access</th></tr></thead><tbody>' +
      (st.length ? st.map(function (s) {
        var p = progressOf(s.code) || {};
        return '<tr' + (s.active ? '' : ' class="off"') + '><th scope="row">' + esc(s.name) + '</th><td><code>' + esc(s.code) + '</code> <button class="icon-btn" data-copy="' + esc(s.code) + '" aria-label="Copy code">' + ico('copy', 16) + '</button></td>' +
          '<td>' + esc(s.batch) + '</td><td>' + (p['Sessions done'] || 0) + '</td><td>' + fmtDate(p['Last visit']) + '</td>' +
          '<td><button class="switch sm' + (s.active ? ' on' : '') + '" role="switch" aria-checked="' + s.active + '" data-active="' + esc(s.code) + '"><span class="knob"></span><span class="lbl">' + (s.active ? 'On' : 'Off') + '</span></button></td></tr>';
      }).join('') : '<tr><td colspan="6" class="muted">No learners yet. Add the first one above.</td></tr>') + '</tbody></table></div>';
  };
  function copy(text, msg) {
    var done = function () { toast(msg || 'Copied.'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, function () { prompt('Copy this:', text); });
    else prompt('Copy this:', text);
  }
  WIRE.learners = function () {
    $('#addForm').onsubmit = function (e) {
      e.preventDefault(); var name = $('#newName').value.trim(); if (!name) return;
      var b = $('button', this); b.disabled = true;
      api({ action: 'tAddStudent', level: T.level, name: name, batch: $('#newBatch').value.trim() }).then(function (r) {
        return refreshOverview().then(function () {
          render();
          $('#newCode').innerHTML = '<div class="card pad newcode sec"><div><small class="muted">New code for ' + esc(r.student.name) + '</small><b>' + esc(r.student.code) + '</b></div>' +
            '<button class="btn" data-copy="' + esc(r.student.code) + '">' + ico('copy', 18) + ' Copy code</button></div>';
          WIRE.learners();
        });
      }, function (err) { b.disabled = false; toast(err.message); });
    };
    $$('[data-copy]').forEach(function (b) { b.onclick = function () { copy(b.getAttribute('data-copy'), 'Code copied.'); }; });
    $$('[data-active]').forEach(function (b) {
      b.onclick = function () {
        var on = b.classList.contains('on');
        if (on && !confirm('Turn off this learner’s access? They will not be able to sign in.')) return;
        b.disabled = true;
        api({ action: 'tSetStudent', code: b.getAttribute('data-active'), active: !on }).then(refreshOverview).then(render, function (err) { b.disabled = false; toast(err.message); });
      };
    });
    $('#copyAll').onclick = function () {
      copy(students().filter(function (s) { return s.active; }).map(function (s) { return s.name + ' – ' + s.code; }).join('\n'), 'List copied. Paste it into WhatsApp or email.');
    };
  };

  // scores -------------------------------------------------------------
  VIEWS.scores = function () {
    var rows = T.data.quiz || [], st = students(), ss = sessions().filter(function (s) { return rows.some(function (r) { return +r.Session === s.session; }) || s.status === 'Open'; });
    var best = {};
    rows.forEach(function (r) {
      var k = String(r.Code).toUpperCase() + ':' + r.Session, p = +r.Percent;
      if (!best[k]) best[k] = { p: p, n: 0 };
      best[k].n++; if (p > best[k].p) best[k].p = p;
    });
    if (!ss.length) return head('Scores', 'Best practice-quiz score per learner and session.') + '<div class="card pad empty">' + ART.empty() + '<p>No quiz scores yet. They appear when learners take the practice quizzes.</p></div>';
    var avg = ss.map(function (s) {
      var v = st.map(function (l) { return best[l.code.toUpperCase() + ':' + s.session]; }).filter(Boolean).map(function (b) { return b.p; });
      return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length) : null;
    });
    return head('Scores', 'Best practice-quiz score per learner and session. The small number is how many attempts.') +
      '<div class="card t-table"><table class="scores"><thead><tr><th>Learner</th>' + ss.map(function (s) { return '<th class="st-' + s.stage + '"><span class="sh">S' + s.session + '</span></th>'; }).join('') + '</tr></thead><tbody>' +
      st.map(function (l) {
        return '<tr><th scope="row">' + esc(l.name) + '</th>' + ss.map(function (s) {
          var b = best[l.code.toUpperCase() + ':' + s.session];
          return b ? '<td><span class="sc ' + (b.p >= 80 ? 'hi' : b.p >= 60 ? 'mid' : 'lo') + '">' + b.p + '%</span><sup>' + b.n + '</sup></td>' : '<td class="muted">–</td>';
        }).join('') + '</tr>';
      }).join('') + '<tr class="avg"><th scope="row">Class average</th>' + avg.map(function (a) { return '<td>' + (a == null ? '–' : a + '%') + '</td>'; }).join('') + '</tr></tbody></table></div>' +
      '<p class="small muted sec">Green 80% and above · gold 60–79% · coral below 60%. Practice quizzes can be taken many times; this shows the best result.</p>';
  };

  // marking ----------------------------------------------------------
  var MK = { tab: 'Workbook', session: '', onlyNew: true };
  var TAB_NAME = { Workbook: 'E-workbooks', Exit_Tickets: 'Exit tickets', Lab: 'Lab steps' };
  function subs() {
    var list = (T.data[MK.tab] || []).slice();
    if (MK.session) list = list.filter(function (r) { return String(MK.tab === 'Lab' ? r.Step : r.Session) === MK.session; });
    if (MK.onlyNew) list = list.filter(function (r) { return r.Mark === '' || r.Mark == null; });
    return list;
  }
  VIEWS.marking = function () {
    var list = subs(), sel = list.filter(function (r) { return r.ID === T.sel; })[0] || list[0];
    T.sel = sel ? sel.ID : null;
    var opts = MK.tab === 'Lab' ? Array.apply(null, Array(12)).map(function (_, i) { return i + 1; }) : sessions().map(function (s) { return s.session; });
    return head('Marking', 'Read answers and give a mark and a comment. Learners see your feedback on their page.') +
      '<div class="t-filters card pad"><div class="seg" role="tablist">' + Object.keys(TAB_NAME).map(function (k) {
        var n = (T.data[k] || []).filter(function (r) { return r.Mark === '' || r.Mark == null; }).length;
        return '<button type="button" class="' + (MK.tab === k ? 'on' : '') + '" data-tab="' + k + '">' + TAB_NAME[k] + (n ? ' <span class="count">' + n + '</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<select class="input sm" id="mkSess" aria-label="Filter"><option value="">' + (MK.tab === 'Lab' ? 'All steps' : 'All sessions') + '</option>' + opts.map(function (n) { return '<option value="' + n + '"' + (String(n) === MK.session ? ' selected' : '') + '>' + (MK.tab === 'Lab' ? 'Step ' : 'Session ') + n + '</option>'; }).join('') + '</select>' +
      '<label class="check"><input type="checkbox" id="mkNew"' + (MK.onlyNew ? ' checked' : '') + '> Only not marked</label></div>' +
      '<div class="t-mark sec"><div class="card t-mlist">' + (list.length ? list.map(function (r) {
        return '<button class="t-mitem' + (r.ID === T.sel ? ' on' : '') + '" data-sub="' + esc(r.ID) + '"><b>' + esc(r.Name) + '</b><small>' + (MK.tab === 'Lab' ? 'Step ' + r.Step : 'Session ' + r.Session) + ' · ' + fmtDate(r.Timestamp, true) + '</small>' +
          (r.Mark !== '' && r.Mark != null ? '<span class="chip gold">' + esc(r.Mark) + '</span>' : '<span class="chip">New</span>') + '</button>';
      }).join('') : '<div class="empty">' + ART.empty() + '<p>Nothing to show.' + (MK.onlyNew ? ' Untick “Only not marked” to see marked work.' : '') + '</p></div>') + '</div>' +
      '<div class="card pad t-detail">' + (sel ? detail(sel) : '<p class="muted">Choose a submission.</p>') + '</div></div>';
  };
  function parse(s) { try { return JSON.parse(s || '{}'); } catch (e) { return { answer: String(s) }; } }
  function detail(r) {
    var ans = parse(MK.tab === 'Lab' ? r.Data : r.Answers), qs = [];
    var c = MK.tab !== 'Lab' && T.content[+r.Session];
    if (c) qs = (MK.tab === 'Workbook' ? c.workbook : c.exit || {}).questions || [];
    var html = '<div class="eyebrow muted">' + (MK.tab === 'Lab' ? 'Lab step ' + r.Step : TAB_NAME[MK.tab].replace(/s$/, '') + ' · Session ' + r.Session) + '</div><h2 class="h3" style="margin:4px 0 2px">' + esc(r.Name) + '</h2>' +
      '<p class="small muted" style="margin:0 0 12px">' + esc(r.Code) + ' · sent ' + fmtDate(r.Timestamp, true) + '</p><div class="t-answers">';
    var keys = qs.length ? qs.map(function (q) { return q.id; }) : Object.keys(ans);
    Object.keys(ans).forEach(function (k) { if (keys.indexOf(k) === -1) keys.push(k); });
    keys.forEach(function (k, i) {
      var q = qs.filter(function (x) { return x.id === k; })[0];
      html += '<div class="t-ans"><b>' + (q ? (i + 1) + '. ' + esc(q.prompt.replace(/\*\*/g, '')) : esc(k)) + '</b><p>' + (ans[k] != null && String(ans[k]).trim() ? esc(typeof ans[k] === 'object' ? JSON.stringify(ans[k]) : ans[k]).replace(/\n/g, '<br>') : '<span class="muted">No answer</span>') + '</p></div>';
    });
    html += '</div><form id="markForm" class="t-markform"><label class="field"><span>Mark</span><input class="input" id="mkMark" maxlength="20" value="' + esc(r.Mark == null ? '' : r.Mark) + '" placeholder="e.g. 8/10 or Good"></label>' +
      '<label class="field"><span>Comment for the learner</span><textarea class="input" id="mkComment" maxlength="2000" placeholder="One thing done well, one thing to improve.">' + esc(r.Comment || '') + '</textarea></label>' +
      '<div class="btns"><button class="btn" type="submit">Save feedback</button><button class="btn ghost" type="button" id="mkNext">Save and next</button></div>' +
      (r['Marked on'] ? '<p class="small muted">Last marked ' + fmtDate(r['Marked on'], true) + '</p>' : '') + '</form>';
    return html;
  }
  WIRE.marking = function () {
    $$('[data-tab]').forEach(function (b) { b.onclick = function () { MK.tab = b.getAttribute('data-tab'); MK.session = ''; T.sel = null; render(); }; });
    $('#mkSess').onchange = function () { MK.session = this.value; T.sel = null; render(); };
    $('#mkNew').onchange = function () { MK.onlyNew = this.checked; T.sel = null; render(); };
    $$('[data-sub]').forEach(function (b) { b.onclick = function () { T.sel = b.getAttribute('data-sub'); render(); if (innerWidth < 900) { var d = $('.t-detail'); if (d) d.scrollIntoView({ behavior: 'smooth' }); } }; });
    var f = $('#markForm'); if (!f) return;
    function save(goNext) {
      var id = T.sel, mark = $('#mkMark').value.trim(), comment = $('#mkComment').value.trim();
      if (!mark && !comment) { toast('Write a mark or a comment first.'); return; }
      $$('button', f).forEach(function (b) { b.disabled = true; });
      var list = subs(), idx = list.map(function (r) { return r.ID; }).indexOf(id);
      api({ action: 'tMark', tab: MK.tab, id: id, mark: mark, comment: comment }).then(function () {
        var row = (T.data[MK.tab] || []).filter(function (r) { return r.ID === id; })[0];
        if (row) { row.Mark = mark; row.Comment = comment; row['Marked on'] = new Date().toISOString(); }
        var c = T.data.overview.counts, key = { Workbook: 'workbooksToMark', Exit_Tickets: 'exitToMark', Lab: 'labToMark' }[MK.tab];
        c[key] = (T.data[MK.tab] || []).filter(function (r) { return r.Mark === '' || r.Mark == null; }).length;
        toast('Feedback saved.');
        var after = subs();
        if (goNext) T.sel = after.length ? (after[Math.min(idx, after.length - 1)] || after[0]).ID : null;
        render();
      }, function (err) { $$('button', f).forEach(function (b) { b.disabled = false; }); toast(err.message); });
    }
    f.onsubmit = function (e) { e.preventDefault(); save(false); };
    $('#mkNext').onclick = function () { save(true); };
  };

  // progress ------------------------------------------------------------
  VIEWS.progress = function () {
    var st = students(), total = sessions().length;
    var wb = T.data.Workbook || [], ex = T.data.Exit_Tickets || [], lab = T.data.Lab || [];
    function count(list, code) { return list.filter(function (r) { return String(r.Code).toUpperCase() === code.toUpperCase(); }).length; }
    return head('Progress', 'Each learner’s route through the course.') +
      '<div class="card t-table"><table><thead><tr><th>Learner</th><th>Route</th><th>Sessions done</th><th>Workbooks</th><th>Exit tickets</th><th>Lab steps</th><th>Cards known</th><th>Last visit</th></tr></thead><tbody>' +
      (st.length ? st.map(function (l) {
        var p = progressOf(l.code) || {}, d = +p['Sessions done'] || 0;
        var doneList = []; try { doneList = (JSON.parse(p.Data || '{}').sessionsDone) || []; } catch (e) { /* ignore */ }
        return '<tr><th scope="row">' + esc(l.name) + '</th><td><div class="mini-route">' + sessions().map(function (s) {
          return '<i class="st-' + s.stage + (doneList.indexOf(s.session) !== -1 ? ' done' : '') + '" title="Session ' + s.session + '"></i>';
        }).join('') + '</div></td><td>' + d + ' / ' + total + '</td><td>' + count(wb, l.code) + '</td><td>' + count(ex, l.code) + '</td><td>' + count(lab, l.code) + '</td><td>' + (p['Cards known'] || 0) + '</td><td>' + fmtDate(p['Last visit'], true) + '</td></tr>';
      }).join('') : '<tr><td colspan="8" class="muted">No learners yet.</td></tr>') + '</tbody></table></div>';
  };

  // --------------------------------------------------------------- boot --
  function boot(force) {
    var p = T.levelInfo && !force ? Promise.resolve(T.levelInfo) : api({ action: 'tLogin' }).then(function (r) { T.levelInfo = r; return r; });
    $('#main').innerHTML = '<div class="empty">Loading…</div>';
    p.then(function (info) {
      var live = info.levels.filter(function (l) { return l.status === 'Live'; });
      if (!T.level || !info.levels.some(function (l) { return l.level === T.level; })) T.level = (live[live.length - 1] || info.levels[info.levels.length - 1]).level;
      store.set('level', T.level);
      frame();
      return loadLevel();
    }).then(render, function (err) {
      if (/teacher code/i.test(err.message)) { sess.del(); store.del('code'); T.code = null; T.levelInfo = null; render(); toast(err.message); return; }
      $('#main').innerHTML = '<div class="card pad note err">' + esc(err.message) + ' <button class="btn ghost sm" onclick="location.reload()">Try again</button></div>';
    });
  }
  getJSON('levels/levels.json').then(function (l) { T.siteLevels = l.levels; }, function () { T.siteLevels = []; }).then(function () {
    if (T.code) boot(); else render();
  });
})();
