/**
 * Logistics & Supply Chain Management Academy — Sheet back end
 * Elevate with Ms. Maria · Learnovate Qatar
 *
 * One Google Sheet serves every level. Each row carries a Level column,
 * so adding Level 4 or Level 5 later needs rows in the Sheet, not new code.
 *
 * How to use: see apps-script/SETUP-GUIDE.md in the repository.
 *   1. Paste this file into Extensions > Apps Script.
 *   2. Run setup() once.
 *   3. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 */

var VERSION = '1.1.0';

// ---------------------------------------------------------------- tabs ----

var TABS = {
  Settings:      ['Key', 'Value', 'Note'],
  Levels:        ['Level', 'Name', 'Status', 'Note'],
  Students:      ['Code', 'Name', 'Level', 'Batch', 'Active', 'Created', 'Email', 'Phone', 'WhatsApp', 'Details updated'],
  Sessions:      ['Level', 'Session', 'Title', 'Stage', 'Type', 'Status', 'Canva link', 'Handout link', 'Opened on'],
  Announcements: ['ID', 'Level', 'Date', 'Text', 'Show'],
  Quiz_Scores:   ['Timestamp', 'Code', 'Name', 'Level', 'Session', 'Score', 'Total', 'Percent', 'Attempt'],
  Workbook:      ['ID', 'Timestamp', 'Code', 'Name', 'Level', 'Session', 'Answers', 'Mark', 'Comment', 'Marked on'],
  Exit_Tickets:  ['ID', 'Timestamp', 'Code', 'Name', 'Level', 'Session', 'Answers', 'Mark', 'Comment', 'Marked on'],
  Lab:           ['ID', 'Timestamp', 'Code', 'Name', 'Level', 'Step', 'Data', 'Mark', 'Comment', 'Marked on'],
  Progress:      ['Code', 'Name', 'Level', 'Sessions done', 'Lab steps', 'Cards known', 'Quizzes taken', 'Last visit', 'Data']
};

var STAGES = ['Plan', 'Source', 'Make', 'Deliver', 'Return'];

// Level 6 sessions (10 teaching sessions + midterm in S6 + final in S12).
var LEVEL6_SESSIONS = [
  [1,  'How supply chains work',                       'Plan',    'Teaching'],
  [2,  'Planning, forecasting and S&OP',               'Plan',    'Teaching'],
  [3,  'Procurement and supplier relationships',       'Source',  'Teaching'],
  [4,  'International trade and global sourcing',      'Source',  'Teaching'],
  [5,  'Inventory and stock control',                  'Make',    'Teaching'],
  [6,  'Midterm exam',                                 'Make',    'Exam'],
  [7,  'Operations, quality and continuous improvement', 'Make',  'Teaching'],
  [8,  'Warehousing and e-commerce fulfilment',        'Deliver', 'Teaching'],
  [9,  'Transport, distribution and last mile',        'Deliver', 'Teaching'],
  [10, 'Risk and resilience',                          'Return',  'Teaching'],
  [11, 'Leading a sustainable, digital supply chain',  'Return',  'Teaching'],
  [12, 'Final exam',                                   'Return',  'Exam']
];

var MAX_CELL = 45000;          // Google Sheets limit is 50,000 characters per cell
var CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L

// --------------------------------------------------------------- setup ----

/** Run once from the Apps Script editor. Safe to run again: it never deletes data. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var headers = TABS[name];
    var first = sh.getRange(1, 1, 1, headers.length).getValues()[0];
    var empty = first.every(function (v) { return v === '' || v === null; });
    if (empty) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    else {
      // New columns added in a later version: fill in only the missing header cells at the end.
      var fixed = headers.map(function (h, i) { return first[i] === '' || first[i] === null ? h : first[i]; });
      sh.getRange(1, 1, 1, headers.length).setValues([fixed]);
    }
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#14213D');
    sh.setFrozenRows(1);
  });

  // Settings
  if (rows_('Settings').length === 0) {
    appendObj_('Settings', { Key: 'TEACHER_CODE', Value: 'MARIA-' + randomCode_(6),
      Note: 'Your code for the teacher dashboard. Change it if you like (letters and numbers only).' });
    appendObj_('Settings', { Key: 'COURSE_NAME', Value: 'Logistics & Supply Chain Management',
      Note: 'Shown at the top of the dashboard.' });
    appendObj_('Settings', { Key: 'CURRENT_BATCH', Value: 'Batch 1',
      Note: 'Default batch for new learners.' });
  }

  // Levels
  if (rows_('Levels').length === 0) {
    appendObj_('Levels', { Level: 4, Name: 'Level 4', Status: 'Coming soon', Note: 'Change to Live when its content is on the site.' });
    appendObj_('Levels', { Level: 5, Name: 'Level 5', Status: 'Coming soon', Note: 'Change to Live when its content is on the site.' });
    appendObj_('Levels', { Level: 6, Name: 'Level 6', Status: 'Live', Note: '' });
  }

  // Level 6 sessions
  var hasL6 = rows_('Sessions').some(function (r) { return String(r.Level) === '6'; });
  if (!hasL6) {
    LEVEL6_SESSIONS.forEach(function (s) {
      appendObj_('Sessions', { Level: 6, Session: s[0], Title: s[1], Stage: s[2], Type: s[3], Status: 'Closed' });
    });
  }

  // One test learner so you can try the site yourself
  if (rows_('Students').length === 0) {
    appendObj_('Students', { Code: 'L6-TEST', Name: 'Test Learner', Level: 6, Batch: 'Test', Active: 'Yes', Created: new Date() });
  }

  addDropdowns_();
  return 'Setup complete';
}

function addDropdowns_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  function list(sheetName, col, values) {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build();
    ss.getSheetByName(sheetName).getRange(2, col, 998, 1).setDataValidation(rule);
  }
  list('Levels', 3, ['Live', 'Coming soon']);
  list('Students', 3, ['4', '5', '6']);
  list('Students', 5, ['Yes', 'No']);
  list('Sessions', 3 + 1, STAGES);
  list('Sessions', 5, ['Teaching', 'Exam']);
  list('Sessions', 6, ['Open', 'Closed']);
  list('Announcements', 5, ['Yes', 'No']);
}

/** Adds a menu to the Sheet. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('LSCM Academy')
    .addItem('Set up / repair tabs', 'setup')
    .addItem('Show my teacher code', 'showTeacherCode_')
    .addToUi();
}

function showTeacherCode_() {
  SpreadsheetApp.getUi().alert('Your teacher code is: ' + setting_('TEACHER_CODE'));
}

// ----------------------------------------------------------- web entry ----

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!p.action) p.action = 'ping';
  return respond_(handle_(p));
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return respond_({ ok: false, error: 'The request could not be read.' }); }
  return respond_(handle_(body));
}

function handle_(req) {
  try {
    var fn = ACTIONS[req.action];
    if (!fn) throw new Error('Unknown action.');
    var out = fn(req) || {};
    out.ok = true;
    return out;
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------- actions ----

var ACTIONS = {
  // ---- public / learner ----
  ping: function () { return { version: VERSION, time: new Date().toISOString() }; },

  levels: function () { return { levels: levelList_() }; },

  login: function (req) { return learnerState_(learner_(req.code)); },

  state: function (req) { return learnerState_(learner_(req.code)); },

  submitQuiz: function (req) {
    var st = learner_(req.code);
    var s = openSession_(st.level, req.session);
    var score = num_(req.score), total = num_(req.total);
    if (total <= 0 || score < 0 || score > total) throw new Error('The score is not valid.');
    return withLock_(function () {
      var attempt = rows_('Quiz_Scores').filter(function (r) {
        return sameCode_(r.Code, st.code) && String(r.Session) === String(s.session);
      }).length + 1;
      appendObj_('Quiz_Scores', { Timestamp: new Date(), Code: st.code, Name: st.name, Level: st.level,
        Session: s.session, Score: score, Total: total, Percent: Math.round(score / total * 100), Attempt: attempt });
      return { attempt: attempt, percent: Math.round(score / total * 100) };
    });
  },

  submitWorkbook: function (req) { return submitWork_('Workbook', req); },
  submitExit:     function (req) { return submitWork_('Exit_Tickets', req); },

  submitLab: function (req) {
    var st = learner_(req.code);
    var step = num_(req.step);
    if (step < 1 || step > 12) throw new Error('The lab step is not valid.');
    var data = clip_(JSON.stringify(req.data || {}));
    return withLock_(function () {
      var id = upsert_('Lab', function (r) { return sameCode_(r.Code, st.code) && String(r.Step) === String(step); },
        { Timestamp: new Date(), Code: st.code, Name: st.name, Level: st.level, Step: step, Data: data });
      return { id: id };
    });
  },

  saveProfile: function (req) {
    var st = learner_(req.code);
    var d = contact_(req);
    if (!d.Email) throw new Error('Please enter your email address.');
    if (!d.Phone) throw new Error('Please enter your mobile number.');
    return withLock_(function () {
      var found = findRow_('Students', function (r) { return sameCode_(r.Code, st.code); });
      d['Details updated'] = new Date();
      updateRow_('Students', found.index, d);
      return { student: learner_(st.code) };
    });
  },

  saveProgress: function (req) {
    var st = learner_(req.code);
    var d = req.data || {};
    return withLock_(function () {
      upsert_('Progress', function (r) { return sameCode_(r.Code, st.code); }, {
        Code: st.code, Name: st.name, Level: st.level,
        'Sessions done': Array.isArray(d.sessionsDone) ? d.sessionsDone.length : num_(d.sessionsDone),
        'Lab steps': num_(d.labSteps), 'Cards known': num_(d.cardsKnown), 'Quizzes taken': num_(d.quizzesTaken),
        'Last visit': new Date(), Data: clip_(JSON.stringify(d))
      }, true);
      return {};
    });
  },

  // ---- teacher ----
  tLogin: function (req) {
    teacher_(req);
    return { course: setting_('COURSE_NAME'), batch: setting_('CURRENT_BATCH'), levels: levelList_() };
  },

  tOverview: function (req) {
    teacher_(req);
    var level = levelArg_(req.level);
    var students = rows_('Students').filter(byLevel_(level));
    var since = Date.now() - 7 * 24 * 3600 * 1000;
    function count(tab, onlyUnmarked) {
      return rows_(tab).filter(byLevel_(level)).filter(function (r) {
        return !onlyUnmarked || r.Mark === '' || r.Mark === null;
      }).length;
    }
    var progress = rows_('Progress').filter(byLevel_(level));
    return {
      level: level,
      sessions: sessionsFor_(level, true),
      students: students.map(publicStudent_),
      announcements: rows_('Announcements').filter(byLevel_(level)).map(announcementOut_).reverse(),
      counts: {
        learners: students.filter(function (r) { return yes_(r.Active); }).length,
        quizzes: count('Quiz_Scores'),
        workbooksToMark: count('Workbook', true),
        exitToMark: count('Exit_Tickets', true),
        labToMark: count('Lab', true),
        activeThisWeek: progress.filter(function (r) { return r['Last visit'] instanceof Date && r['Last visit'].getTime() > since; }).length
      }
    };
  },

  tSetSession: function (req) {
    teacher_(req);
    var level = levelArg_(req.level);
    var session = num_(req.session);
    return withLock_(function () {
      var found = findRow_('Sessions', function (r) { return String(r.Level) === level && String(r.Session) === String(session); });
      if (!found) throw new Error('Session ' + session + ' was not found for Level ' + level + '.');
      var patch = {};
      if (req.status !== undefined) {
        if (req.status !== 'Open' && req.status !== 'Closed') throw new Error('Status must be Open or Closed.');
        patch.Status = req.status;
        if (req.status === 'Open' && !found.row['Opened on']) patch['Opened on'] = new Date();
      }
      if (req.canva !== undefined) patch['Canva link'] = link_(req.canva);
      if (req.handout !== undefined) patch['Handout link'] = link_(req.handout);
      if (req.title !== undefined) patch.Title = text_(req.title, 120);
      updateRow_('Sessions', found.index, patch);
      return { sessions: sessionsFor_(level, true) };
    });
  },

  tAnnounce: function (req) {
    teacher_(req);
    var level = levelArg_(req.level);
    var text = text_(req.text, 1000);
    if (!text) throw new Error('Write the announcement first.');
    return withLock_(function () {
      var id = newId_();
      appendObj_('Announcements', { ID: id, Level: level, Date: new Date(), Text: text, Show: 'Yes' });
      return { id: id };
    });
  },

  tShowAnnouncement: function (req) {
    teacher_(req);
    return withLock_(function () {
      var found = findRow_('Announcements', function (r) { return String(r.ID) === String(req.id); });
      if (!found) throw new Error('Announcement not found.');
      updateRow_('Announcements', found.index, { Show: req.show ? 'Yes' : 'No' });
      return {};
    });
  },

  tAddStudent: function (req) {
    teacher_(req);
    var level = levelArg_(req.level);
    var name = text_(req.name, 80);
    if (!name) throw new Error('Write the learner\'s name.');
    return withLock_(function () {
      var existing = rows_('Students').map(function (r) { return String(r.Code).toUpperCase(); });
      var code;
      do { code = 'L' + level + '-' + randomCode_(5); } while (existing.indexOf(code) !== -1);
      var batch = text_(req.batch, 40) || setting_('CURRENT_BATCH') || '';
      appendObj_('Students', { Code: code, Name: name, Level: Number(level), Batch: batch, Active: 'Yes', Created: new Date() });
      return { student: { code: code, name: name, level: level, batch: batch, active: true } };
    });
  },

  tSetStudent: function (req) {
    teacher_(req);
    return withLock_(function () {
      var found = findRow_('Students', function (r) { return sameCode_(r.Code, req.code); });
      if (!found) throw new Error('Learner not found.');
      var patch = {};
      if (req.active !== undefined) patch.Active = req.active ? 'Yes' : 'No';
      if (req.name !== undefined) patch.Name = text_(req.name, 80);
      if (req.batch !== undefined) patch.Batch = text_(req.batch, 40);
      if (req.email !== undefined || req.phone !== undefined || req.whatsapp !== undefined) {
        var c = contact_(req, true);
        Object.keys(c).forEach(function (k) { patch[k] = c[k]; });
        patch['Details updated'] = new Date();
      }
      updateRow_('Students', found.index, patch);
      return {};
    });
  },

  tList: function (req) {
    teacher_(req);
    var level = levelArg_(req.level);
    var allowed = ['Students', 'Quiz_Scores', 'Workbook', 'Exit_Tickets', 'Lab', 'Progress'];
    if (allowed.indexOf(req.tab) === -1) throw new Error('That list is not available.');
    var list = rows_(req.tab).filter(byLevel_(level));
    if (req.session) list = list.filter(function (r) { return String(r.Session) === String(req.session); });
    return { rows: list.map(plain_).reverse() };
  },

  tMark: function (req) {
    teacher_(req);
    if (['Workbook', 'Exit_Tickets', 'Lab'].indexOf(req.tab) === -1) throw new Error('That list cannot be marked.');
    return withLock_(function () {
      var found = findRow_(req.tab, function (r) { return String(r.ID) === String(req.id); });
      if (!found) throw new Error('Submission not found.');
      updateRow_(req.tab, found.index, { Mark: text_(req.mark, 20), Comment: text_(req.comment, 2000), 'Marked on': new Date() });
      return {};
    });
  },

  tSetLevel: function (req) {
    teacher_(req);
    var level = levelArg_(req.level);
    if (req.status !== 'Live' && req.status !== 'Coming soon') throw new Error('Status must be Live or Coming soon.');
    return withLock_(function () {
      var found = findRow_('Levels', function (r) { return String(r.Level) === level; });
      if (!found) throw new Error('Level not found.');
      updateRow_('Levels', found.index, { Status: req.status });
      return { levels: levelList_() };
    });
  }
};

// -------------------------------------------------------- learner logic ----

function learner_(code) {
  if (!code) throw new Error('Enter your access code.');
  var r = rows_('Students').filter(function (s) { return sameCode_(s.Code, code); })[0];
  if (!r) throw new Error('This code was not found. Check it and try again.');
  if (!yes_(r.Active)) throw new Error('This code is not active. Please ask Ms. Maria.');
  var level = String(r.Level);
  var lv = levelList_().filter(function (l) { return l.level === level; })[0];
  if (!lv || lv.status !== 'Live') throw new Error('Your level is not open yet. Please ask Ms. Maria.');
  return { code: String(r.Code).toUpperCase(), name: String(r.Name), level: level, batch: String(r.Batch || ''),
    email: String(r.Email || ''), phone: String(r.Phone || ''), whatsapp: String(r.WhatsApp || '') };
}

function learnerState_(st) {
  var mine = function (r) { return sameCode_(r.Code, st.code); };
  var quiz = {};
  rows_('Quiz_Scores').filter(mine).forEach(function (r) {
    var k = String(r.Session);
    var p = num_(r.Percent);
    if (!quiz[k] || p > quiz[k].best) quiz[k] = { best: p, attempts: num_(r.Attempt) };
  });
  function marks(tab, key) {
    var out = {};
    rows_(tab).filter(mine).forEach(function (r) {
      out[String(r[key])] = { sent: iso_(r.Timestamp), mark: r.Mark === null ? '' : String(r.Mark), comment: String(r.Comment || '') };
    });
    return out;
  }
  var prog = rows_('Progress').filter(mine)[0];
  var progData = {};
  if (prog && prog.Data) { try { progData = JSON.parse(prog.Data); } catch (e) { progData = {}; } }
  return {
    student: st,
    levels: levelList_(),
    sessions: sessionsFor_(st.level, false),
    announcements: rows_('Announcements').filter(byLevel_(st.level))
      .filter(function (r) { return yes_(r.Show); }).map(announcementOut_).reverse(),
    results: { quiz: quiz, workbook: marks('Workbook', 'Session'), exit: marks('Exit_Tickets', 'Session'), lab: marks('Lab', 'Step') },
    progress: progData
  };
}

function submitWork_(tab, req) {
  var st = learner_(req.code);
  var s = openSession_(st.level, req.session);
  var answers = clip_(JSON.stringify(req.answers || {}));
  return withLock_(function () {
    var id = upsert_(tab, function (r) { return sameCode_(r.Code, st.code) && String(r.Session) === String(s.session); },
      { Timestamp: new Date(), Code: st.code, Name: st.name, Level: st.level, Session: s.session, Answers: answers });
    return { id: id };
  });
}

function openSession_(level, session) {
  var n = num_(session);
  var s = sessionsFor_(level, true).filter(function (x) { return x.session === n; })[0];
  if (!s) throw new Error('This session was not found.');
  if (s.status !== 'Open') throw new Error('This session is not open yet.');
  return s;
}

function sessionsFor_(level, forTeacher) {
  return rows_('Sessions').filter(byLevel_(level)).map(function (r) {
    var open = String(r.Status) === 'Open';
    var s = { session: num_(r.Session), title: String(r.Title), stage: String(r.Stage), type: String(r.Type || 'Teaching'),
      status: open ? 'Open' : 'Closed' };
    // Learners only receive the links of open sessions.
    if (open || forTeacher) { s.canva = String(r['Canva link'] || ''); s.handout = String(r['Handout link'] || ''); }
    if (forTeacher) s.openedOn = iso_(r['Opened on']);
    return s;
  }).sort(function (a, b) { return a.session - b.session; });
}

function levelList_() {
  return rows_('Levels').map(function (r) {
    return { level: String(r.Level), name: String(r.Name), status: String(r.Status) === 'Live' ? 'Live' : 'Coming soon' };
  }).sort(function (a, b) { return Number(a.level) - Number(b.level); });
}

function teacher_(req) {
  var real = String(setting_('TEACHER_CODE') || '').trim();
  if (!real) throw new Error('No teacher code is set in the Settings tab.');
  if (String(req.teacherCode || '').trim().toUpperCase() !== real.toUpperCase()) throw new Error('The teacher code is not correct.');
}

function levelArg_(level) {
  var l = String(level || '').trim();
  var ok = levelList_().some(function (x) { return x.level === l; });
  if (!ok) throw new Error('Choose a level.');
  return l;
}

// ------------------------------------------------------------- helpers ----

function sheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('The ' + name + ' tab is missing. Run setup() in Apps Script.');
  return sh;
}

/** All data rows of a tab as objects keyed by header. */
function rows_(name) {
  var sh = sheet_(name);
  var last = sh.getLastRow();
  var headers = TABS[name];
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  return values.map(function (v) {
    var o = {};
    headers.forEach(function (h, i) { o[h] = v[i]; });
    return o;
  }).filter(function (o) {
    return headers.some(function (h) { return o[h] !== '' && o[h] !== null; });
  });
}

function findRow_(name, test) {
  var sh = sheet_(name);
  var last = sh.getLastRow();
  var headers = TABS[name];
  if (last < 2) return null;
  var values = sh.getRange(2, 1, last - 1, headers.length).getValues();
  for (var i = 0; i < values.length; i++) {
    var o = {};
    headers.forEach(function (h, j) { o[h] = values[i][j]; });
    if (test(o)) return { index: i + 2, row: o };
  }
  return null;
}

function appendObj_(name, obj) {
  var headers = TABS[name];
  sheet_(name).appendRow(headers.map(function (h) { return obj[h] === undefined ? '' : safe_(obj[h]); }));
}

function updateRow_(name, rowIndex, patch) {
  var headers = TABS[name];
  var sh = sheet_(name);
  var range = sh.getRange(rowIndex, 1, 1, headers.length);
  var current = range.getValues()[0];
  var next = headers.map(function (h, i) { return patch[h] === undefined ? current[i] : safe_(patch[h]); });
  range.setValues([next]);
}

/** Update the matching row, or add a new one. Returns the row ID (if the tab has one). */
function upsert_(name, test, obj, noId) {
  var found = findRow_(name, test);
  if (found) {
    updateRow_(name, found.index, obj);
    return found.row.ID || '';
  }
  if (!noId && TABS[name].indexOf('ID') !== -1) obj.ID = newId_();
  appendObj_(name, obj);
  return obj.ID || '';
}

function setting_(key) {
  var r = rows_('Settings').filter(function (s) { return String(s.Key) === key; })[0];
  return r ? String(r.Value) : '';
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/** Stops text that starts with = + - @ from running as a formula in the Sheet. */
function safe_(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function byLevel_(level) { return function (r) { return String(r.Level) === String(level); }; }
function sameCode_(a, b) { return String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase() && String(b || '').trim() !== ''; }
function yes_(v) { return String(v).trim().toLowerCase() === 'yes'; }
function num_(v) { var n = Number(v); return isFinite(n) ? n : 0; }
function text_(v, max) { return String(v === undefined || v === null ? '' : v).trim().slice(0, max); }
function clip_(s) { return s.length > MAX_CELL ? s.slice(0, MAX_CELL) : s; }
function iso_(d) { return d instanceof Date ? d.toISOString() : (d ? String(d) : ''); }
function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }

function link_(v) {
  var s = text_(v, 500);
  if (s && !/^https:\/\//i.test(s)) throw new Error('Links must start with https://');
  return s;
}

function randomCode_(n) {
  var out = '';
  for (var i = 0; i < n; i++) out += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  return out;
}

function plain_(r) {
  var o = {};
  Object.keys(r).forEach(function (k) { o[k] = r[k] instanceof Date ? r[k].toISOString() : r[k]; });
  return o;
}

/** Checks and tidies email and phone numbers. allowBlank: the teacher may clear a field. */
function contact_(req, allowBlank) {
  var out = {};
  if (req.email !== undefined) {
    var e = text_(req.email, 120).toLowerCase();
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw new Error('The email address does not look right.');
    out.Email = e;
  }
  ['phone', 'whatsapp'].forEach(function (k) {
    if (req[k] === undefined) return;
    var v = text_(req[k], 30).replace(/[^\d+]/g, '');
    if (v && !/^\+?\d{7,15}$/.test(v)) throw new Error('The ' + (k === 'phone' ? 'mobile' : 'WhatsApp') + ' number does not look right. Use digits only, for example +97455123456.');
    // A leading apostrophe makes Google Sheets keep the number as text (keeps + and leading zeros).
    out[k === 'phone' ? 'Phone' : 'WhatsApp'] = v ? "'" + v : '';
  });
  return out;
}

function publicStudent_(r) {
  return { code: String(r.Code), name: String(r.Name), level: String(r.Level), batch: String(r.Batch || ''), active: yes_(r.Active),
    email: String(r.Email || ''), phone: String(r.Phone || ''), whatsapp: String(r.WhatsApp || '') };
}

function announcementOut_(r) {
  return { id: String(r.ID), date: iso_(r.Date), text: String(r.Text), show: yes_(r.Show) };
}
