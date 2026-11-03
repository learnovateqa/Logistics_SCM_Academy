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

var VERSION = '1.3.0';

// ---------------------------------------------------------------- tabs ----

var TABS = {
  Settings:      ['Key', 'Value', 'Note'],
  Levels:        ['Level', 'Name', 'Status', 'Note'],
  Students:      ['Code', 'Name', 'Level', 'Batch', 'Active', 'Created', 'Email', 'Phone', 'WhatsApp', 'Details updated'],
  Sessions:      ['Level', 'Session', 'Title', 'Stage', 'Type', 'Status', 'Canva link', 'Handout link', 'Opened on'],
  Announcements: ['ID', 'Level', 'Date', 'Text', 'Show'],
  Quiz_Scores:   ['Timestamp', 'Code', 'Name', 'Level', 'Session', 'Score', 'Total', 'Percent', 'Attempt'],
  Workbook:      ['ID', 'Timestamp', 'Code', 'Name', 'Level', 'Session', 'Answers', 'Mark', 'Comment', 'Marked on', 'Score', 'Total'],
  Exit_Tickets:  ['ID', 'Timestamp', 'Code', 'Name', 'Level', 'Session', 'Answers', 'Mark', 'Comment', 'Marked on'],
  Lab:           ['ID', 'Timestamp', 'Code', 'Name', 'Level', 'Step', 'Data', 'Mark', 'Comment', 'Marked on'],
  Progress:      ['Code', 'Name', 'Level', 'Sessions done', 'Lab steps', 'Cards known', 'Quizzes taken', 'Last visit', 'Data'],
  Attendance:    ['ID', 'Level', 'Session', 'Date', 'Code', 'Name', 'Status', 'Note'],
  Grades:        ['Code', 'Name', 'Level', 'Midterm', 'Final', 'Participation', 'Updated'],
  Exams:         ['ID', 'Timestamp', 'Code', 'Name', 'Level', 'Exam', 'Score', 'Total', 'Percent', 'Attempt', 'Counted']
};

var EXAMS = { midterm: { label: 'Midterm exam', session: 6, col: 'Midterm' }, final: { label: 'Final exam', session: 12, col: 'Final' } };

var STAGES = ['Plan', 'Source', 'Make', 'Deliver', 'Return'];
var ATT_STATUS = ['Present', 'Late', 'Absent', 'Excused'];
var GRADE_PARTS = ['MIDTERM', 'FINAL', 'WORKBOOKS', 'ATTENDANCE', 'PARTICIPATION'];

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

  // Settings added in later versions (only added when missing)
  ensureSetting_('SHOW_GRADES', 'Yes', 'Yes = learners see their own grades in the app. No = only you see them.');
  ensureSetting_('W_MIDTERM', 30, 'Weight of the midterm in the final grade (%).');
  ensureSetting_('W_FINAL', 40, 'Weight of the final exam (%).');
  ensureSetting_('W_WORKBOOKS', 20, 'Weight of the average e-workbook mark (%).');
  ensureSetting_('W_ATTENDANCE', 10, 'Weight of attendance (%).');
  ensureSetting_('W_PARTICIPATION', 0, 'Weight of participation (%). All weights should add up to 100.');
  ensureSetting_('MIDTERM_LINK', '', 'Link to your midterm exam page (https://…). Set it in the teacher portal: Grades → Exams.');
  ensureSetting_('MIDTERM_OPEN', 'No', 'Yes = learners see the midterm button.');
  ensureSetting_('FINAL_LINK', '', 'Link to your final exam page (https://…).');
  ensureSetting_('FINAL_OPEN', 'No', 'Yes = learners see the final exam button.');

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
  list('Attendance', 7, ATT_STATUS);
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

  // Score from Ms. Maria's own midterm / final page. Only the first attempt goes into Grades;
  // later attempts are kept in the Exams tab. The exam must be open (teacher portal → Grades → Exams).
  submitExam: function (req) {
    var st = learner_(req.code), key = String(req.exam || '').toLowerCase(), ex = EXAMS[key];
    if (!ex) throw new Error('Unknown exam. Use "midterm" or "final".');
    if (!yes_(setting_(key.toUpperCase() + '_OPEN'))) throw new Error('This exam is not open.');
    var score = Number(req.score), total = Number(req.total);
    if (!isFinite(score) || !isFinite(total) || total <= 0 || total > 1000 || score < 0 || score > total) throw new Error('The score is not valid.');
    var pct = Math.round(score / total * 1000) / 10;
    return withLock_(function () {
      var prev = rows_('Exams').filter(function (r) { return sameCode_(r.Code, st.code) && String(r.Exam) === key; });
      var first = !prev.length;
      appendObj_('Exams', { ID: newId_(), Timestamp: new Date(), Code: st.code, Name: st.name, Level: st.level, Exam: key,
        Score: score, Total: total, Percent: pct, Attempt: prev.length + 1, Counted: first ? 'Yes' : 'No' });
      if (first) {
        var patch = { Code: st.code, Name: st.name, Level: st.level, Updated: new Date() }; patch[ex.col] = pct;
        upsert_('Grades', function (r) { return sameCode_(r.Code, st.code); }, patch, true);
      }
      return { percent: pct, counted: first, attempt: prev.length + 1 };
    });
  },
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

  tAttendance: function (req) {
    teacher_(req);
    var level = levelArg_(req.level), session = num_(req.session);
    var rows = rows_('Attendance').filter(function (r) { return String(r.Level) === level && num_(r.Session) === session; });
    var att = attendanceByCode_(level);
    return { session: session, students: rows_('Students').filter(byLevel_(level)).filter(function (r) { return yes_(r.Active); }).map(function (st) {
      var r = rows.filter(function (x) { return sameCode_(x.Code, st.Code); })[0];
      var a = att[String(st.Code).toUpperCase()] || {};
      return { code: String(st.Code), name: String(st.Name), status: r ? String(r.Status) : '', note: r ? String(r.Note || '') : '', pct: a.pct == null ? null : a.pct };
    }).sort(function (a, b) { return a.name.localeCompare(b.name); }) };
  },

  tSetAttendance: function (req) {
    teacher_(req);
    var level = levelArg_(req.level), session = num_(req.session);
    if (!(session >= 1)) throw new Error('Choose a session.');
    var recs = Array.isArray(req.records) ? req.records : [];
    return withLock_(function () {
      var students = rows_('Students').filter(byLevel_(level));
      var saved = 0;
      recs.forEach(function (rec) {
        if (ATT_STATUS.indexOf(rec.status) === -1) return;
        var st = students.filter(function (x) { return sameCode_(x.Code, rec.code); })[0];
        if (!st) return;
        upsert_('Attendance', function (r) { return String(r.Level) === level && num_(r.Session) === session && sameCode_(r.Code, st.Code); },
          { Level: Number(level), Session: session, Date: new Date(), Code: String(st.Code).toUpperCase(), Name: String(st.Name), Status: rec.status, Note: text_(rec.note, 200) });
        saved++;
      });
      return { saved: saved };
    });
  },

  tGrades: function (req) {
    teacher_(req);
    var level = levelArg_(req.level), g = gradesFor_(level);
    return { weights: weights_(), showGrades: yes_(setting_('SHOW_GRADES') || 'Yes'),
      rows: rows_('Students').filter(byLevel_(level)).filter(function (r) { return yes_(r.Active); }).map(function (st) {
        var x = g[String(st.Code).toUpperCase()]; x.code = String(st.Code); x.name = String(st.Name); return x;
      }).sort(function (a, b) { return a.name.localeCompare(b.name); }) };
  },

  tSetGrade: function (req) {
    teacher_(req);
    var level = levelArg_(req.level);
    var st = rows_('Students').filter(byLevel_(level)).filter(function (r) { return sameCode_(r.Code, req.code); })[0];
    if (!st) throw new Error('Learner not found.');
    var patch = { Code: String(st.Code).toUpperCase(), Name: String(st.Name), Level: Number(level), Updated: new Date() };
    ['midterm', 'final', 'participation'].forEach(function (k) {
      if (req[k] === undefined) return;
      var v = String(req[k]).trim();
      if (v === '') { patch[k.charAt(0).toUpperCase() + k.slice(1)] = ''; return; }
      var n = Number(v);
      if (!isFinite(n) || n < 0 || n > 100) throw new Error('Grades must be numbers from 0 to 100.');
      patch[k.charAt(0).toUpperCase() + k.slice(1)] = n;
    });
    return withLock_(function () {
      upsert_('Grades', function (r) { return sameCode_(r.Code, st.Code); }, patch, true);
      return { row: gradesFor_(level)[String(st.Code).toUpperCase()] };
    });
  },

  tGradeSettings: function (req) {
    teacher_(req);
    return withLock_(function () {
      if (req.showGrades !== undefined) setSetting_('SHOW_GRADES', req.showGrades ? 'Yes' : 'No');
      if (req.weights) {
        var total = 0;
        GRADE_PARTS.forEach(function (k) {
          var n = Number(req.weights[k.toLowerCase()]);
          if (!isFinite(n) || n < 0 || n > 100) throw new Error('Each weight must be from 0 to 100.');
          total += n;
        });
        if (Math.abs(total - 100) > 0.01) throw new Error('The weights must add up to 100. Now they add up to ' + total + '.');
        GRADE_PARTS.forEach(function (k) { setSetting_('W_' + k, Number(req.weights[k.toLowerCase()])); });
      }
      return { weights: weights_(), showGrades: yes_(setting_('SHOW_GRADES') || 'Yes') };
    });
  },

  tExams: function (req) {
    teacher_(req);
    if (req.set) {
      withLock_(function () {
        Object.keys(EXAMS).forEach(function (k) {
          var e = req.set[k]; if (!e) return;
          if (e.url !== undefined) {
            var u = String(e.url).trim();
            if (u && !/^https:\/\/[^\s"'<>]+$/.test(u)) throw new Error('The ' + EXAMS[k].label.toLowerCase() + ' link must start with https://');
            setSetting_(k.toUpperCase() + '_LINK', u);
          }
          if (e.open !== undefined) setSetting_(k.toUpperCase() + '_OPEN', e.open ? 'Yes' : 'No');
        });
      });
    }
    var level = req.level ? levelArg_(req.level) : null;
    var log = rows_('Exams').filter(function (r) { return !level || String(r.Level) === String(level); }).map(function (r) {
      return { id: String(r.ID), when: iso_(r.Timestamp), code: String(r.Code), name: String(r.Name), exam: String(r.Exam), score: num_(r.Score), total: num_(r.Total), percent: num_(r.Percent), attempt: num_(r.Attempt), counted: String(r.Counted) };
    }).reverse();
    return { exams: examsFor_(), log: log };
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
      if (r.Total !== undefined && r.Total !== '' && r.Total !== null) { out[String(r[key])].score = num_(r.Score); out[String(r[key])].total = num_(r.Total); }
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
    results: { quiz: quiz, workbook: marks('Workbook', 'Session'), exit: marks('Exit_Tickets', 'Session'), lab: marks('Lab', 'Step'),
      attendance: attendanceByCode_(st.level)[st.code] || { pct: null, sessions: [] },
      grades: yes_(setting_('SHOW_GRADES') || 'Yes') ? gradesFor_(st.level)[st.code] || null : null },
    progress: progData,
    exams: examsFor_().filter(function (e) { return e.open && e.url; })
  };
}

function submitWork_(tab, req) {
  var st = learner_(req.code);
  var s = openSession_(st.level, req.session);
  var answers = clip_(JSON.stringify(req.answers || {}));
  return withLock_(function () {
    var row = { Timestamp: new Date(), Code: st.code, Name: st.name, Level: st.level, Session: s.session, Answers: answers };
    if (tab === 'Workbook' && req.total !== undefined) {
      var sc = Number(req.score), tt = Number(req.total);
      if (!isFinite(sc) || !isFinite(tt) || tt <= 0 || tt > 500 || sc < 0 || sc > tt) throw new Error('The workbook score is not valid.');
      row.Score = sc; row.Total = tt;
    }
    var id = upsert_(tab, function (r) { return sameCode_(r.Code, st.code) && String(r.Session) === String(s.session); }, row);
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

// ---------------------------------------------------- attendance & grades --

/** Attendance per learner: Present and Late count as attended; Excused is left out. */
function attendanceByCode_(level) {
  var out = {};
  rows_('Attendance').filter(byLevel_(level)).forEach(function (r) {
    var k = String(r.Code).toUpperCase();
    var a = out[k] || (out[k] = { present: 0, late: 0, absent: 0, excused: 0, sessions: [] });
    var s = String(r.Status).toLowerCase();
    if (a.hasOwnProperty(s)) a[s]++;
    a.sessions.push({ session: num_(r.Session), status: String(r.Status), note: String(r.Note || '') });
  });
  Object.keys(out).forEach(function (k) {
    var a = out[k], counted = a.present + a.late + a.absent;
    a.pct = counted ? Math.round((a.present + a.late) / counted * 100) : null;
    a.sessions.sort(function (x, y) { return x.session - y.session; });
  });
  return out;
}

/** Turns a mark like "8/10", "80%" or "80" into a percentage. Text marks ("Good") are ignored. */
function markPct_(m) {
  var s = String(m == null ? '' : m).trim(), x;
  if ((x = s.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)) && Number(x[2]) > 0) return Number(x[1]) / Number(x[2]) * 100;
  if ((x = s.match(/^(\d+(?:\.\d+)?)\s*%$/))) return Number(x[1]);
  if (/^\d+(\.\d+)?$/.test(s) && Number(s) <= 100) return Number(s);
  return null;
}

// One workbook's percent: auto-scored tasks plus the teacher's mark for the written part.
// "8/10" adds points (score + 8) / (total + 10); a percent mark is averaged with the auto score.
function workbookPct_(r) {
  var tot = num_(r.Total), auto = tot > 0 ? num_(r.Score) / tot * 100 : null, m = String(r.Mark == null ? '' : r.Mark).trim(), x;
  if (tot > 0 && (x = m.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/)) && Number(x[2]) > 0) return (num_(r.Score) + Number(x[1])) / (tot + Number(x[2])) * 100;
  var mp = markPct_(m);
  if (auto != null && mp != null) return (auto + mp) / 2;
  return auto != null ? auto : mp;
}

function examsFor_() {
  return Object.keys(EXAMS).map(function (k) {
    return { key: k, label: EXAMS[k].label, session: EXAMS[k].session, url: setting_(k.toUpperCase() + '_LINK'), open: yes_(setting_(k.toUpperCase() + '_OPEN')) };
  });
}

function weights_() {
  var w = {};
  GRADE_PARTS.forEach(function (k) { var v = Number(setting_('W_' + k)); w[k.toLowerCase()] = isFinite(v) && setting_('W_' + k) !== '' ? v : { MIDTERM: 30, FINAL: 40, WORKBOOKS: 20, ATTENDANCE: 10, PARTICIPATION: 0 }[k]; });
  return w;
}

/** Each learner's grade parts and the weighted grade so far (using only the parts that have a value). */
function gradesFor_(level) {
  var w = weights_(), att = attendanceByCode_(level), out = {};
  var gradeRows = rows_('Grades').filter(byLevel_(level)), wb = rows_('Workbook').filter(byLevel_(level));
  rows_('Students').filter(byLevel_(level)).forEach(function (st) {
    var k = String(st.Code).toUpperCase();
    var g = gradeRows.filter(function (r) { return sameCode_(r.Code, k); })[0] || {};
    var marks = wb.filter(function (r) { return sameCode_(r.Code, k); }).map(workbookPct_).filter(function (v) { return v != null; });
    var parts = {
      midterm: g.Midterm === '' || g.Midterm == null ? null : Number(g.Midterm),
      final: g.Final === '' || g.Final == null ? null : Number(g.Final),
      participation: g.Participation === '' || g.Participation == null ? null : Number(g.Participation),
      workbooks: marks.length ? Math.round(marks.reduce(function (a, b) { return a + b; }, 0) / marks.length * 10) / 10 : null,
      attendance: att[k] && att[k].pct != null ? att[k].pct : null
    };
    var sumW = 0, sum = 0, all = true;
    Object.keys(parts).forEach(function (p) {
      if (!w[p]) return;
      if (parts[p] == null) { all = false; return; }
      sumW += w[p]; sum += parts[p] * w[p];
    });
    parts.workbooksMarked = marks.length;
    parts.grade = sumW ? Math.round(sum / sumW * 10) / 10 : null;
    parts.complete = all;
    out[k] = parts;
  });
  return out;
}

function ensureSetting_(key, value, note) {
  if (!rows_('Settings').some(function (r) { return String(r.Key) === key; })) appendObj_('Settings', { Key: key, Value: value, Note: note });
}

function setSetting_(key, value) {
  var found = findRow_('Settings', function (r) { return String(r.Key) === key; });
  if (found) updateRow_('Settings', found.index, { Value: value }); else appendObj_('Settings', { Key: key, Value: value, Note: '' });
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
