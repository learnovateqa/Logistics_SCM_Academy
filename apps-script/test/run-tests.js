/*
 * Tests Code.gs against a stand-in Google Sheet, without touching Google.
 * Run:  node apps-script/test/run-tests.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert');

// ---------- stand-in Google services ----------
function chain(target) {
  // Any formatting call we do not model (setFontWeight, setBackground...) just returns the object.
  return new Proxy(target, { get: (t, k) => (k in t ? t[k] : () => chain(t)) });
}
function makeSheet(name) {
  const data = []; // array of rows (arrays)
  const sh = {
    name, data, frozen: 0, validations: [],
    getLastRow() {
      for (let i = data.length - 1; i >= 0; i--) if (data[i].some(v => v !== '' && v !== null && v !== undefined)) return i + 1;
      return 0;
    },
    getRange(r, c, nr = 1, nc = 1) {
      return chain({
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) { let v = (data[r - 1 + i] || [])[c - 1 + j]; if (typeof v === 'string' && v[0] === "'") v = v.slice(1); /* like Google Sheets: the apostrophe is not part of the value */ row.push(v === undefined ? '' : v); }
            out.push(row);
          }
          return out;
        },
        setValues(vals) {
          vals.forEach((row, i) => { data[r - 1 + i] = data[r - 1 + i] || []; row.forEach((v, j) => { data[r - 1 + i][c - 1 + j] = v; }); });
          return this;
        },
        setDataValidation(rule) { sh.validations.push({ c, rule }); return this; }
      });
    },
    appendRow(row) { data[sh.getLastRow()] = row.slice(); },
    setFrozenRows(n) { sh.frozen = n; }
  };
  return sh;
}
function makeSpreadsheet() {
  const sheets = {};
  return { sheets,
    getSheetByName: n => sheets[n] || null,
    insertSheet: n => (sheets[n] = makeSheet(n)) };
}

let ss = makeSpreadsheet();
const ctx = {
  SpreadsheetApp: {
    getActiveSpreadsheet: () => ss,
    newDataValidation: () => chain({ build: () => ({ rule: true }) }),
    getUi: () => chain({})
  },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => chain({ body: s, setMimeType() { return this; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: { getUuid: () => crypto.randomUUID() },
  console, Date, JSON, Math, Object, Array, String, Number, isFinite
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'Code.gs'), 'utf8'), ctx);

// Call through the real web entry points, the same way the site will.
function post(body) {
  const out = ctx.doPost({ postData: { contents: JSON.stringify(body) } });
  return JSON.parse(out.body);
}
function get(params) { return JSON.parse(ctx.doGet({ parameter: params }).body); }

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}
const settingsVal = key => ss.sheets.Settings.data.find(r => r[0] === key)[1];

// ---------- tests ----------
console.log('Setup');
test('setup creates the 10 tabs with headers', () => {
  assert.strictEqual(ctx.setup(), 'Setup complete');
  const tabs = Object.keys(ss.sheets);
  assert.strictEqual(tabs.length, 10);
  assert.deepStrictEqual(ss.sheets.Students.data[0], ['Code', 'Name', 'Level', 'Batch', 'Active', 'Created', 'Email', 'Phone', 'WhatsApp', 'Details updated']);
  assert.strictEqual(ss.sheets.Students.frozen, 1);
});
test('setup seeds 12 Level 6 sessions, all Closed, exams at S6 and S12', () => {
  const rows = ss.sheets.Sessions.data.slice(1);
  assert.strictEqual(rows.length, 12);
  assert(rows.every(r => r[0] === 6 && r[5] === 'Closed'));
  assert.deepStrictEqual(rows.filter(r => r[4] === 'Exam').map(r => r[1]), [6, 12]);
});
test('setup seeds Levels 4 and 5 as Coming soon, 6 as Live', () => {
  assert.deepStrictEqual(ss.sheets.Levels.data.slice(1).map(r => [r[0], r[2]]), [[4, 'Coming soon'], [5, 'Coming soon'], [6, 'Live']]);
});
test('setup makes a random teacher code', () => assert(/^MARIA-[A-Z0-9]{6}$/.test(settingsVal('TEACHER_CODE'))));
test('running setup again does not duplicate anything', () => {
  ctx.setup();
  assert.strictEqual(ss.sheets.Sessions.data.length, 13);
  assert.strictEqual(ss.sheets.Settings.data.length, 4);
  assert.strictEqual(ss.sheets.Students.data.length, 2);
});

const T = settingsVal('TEACHER_CODE');

console.log('Learner');
test('ping works through GET', () => { const r = get({}); assert(r.ok && r.version); });
test('wrong code is refused with a clear message', () => {
  const r = post({ action: 'login', code: 'NOPE' });
  assert(!r.ok && /not found/.test(r.error));
});
test('test learner can sign in (code is not case-sensitive)', () => {
  const r = post({ action: 'login', code: ' l6-test ' });
  assert(r.ok, r.error);
  assert.strictEqual(r.student.level, '6');
  assert.strictEqual(r.sessions.length, 12);
  assert.strictEqual(r.levels.find(l => l.level === '4').status, 'Coming soon');
});
test('closed sessions do not send their links to learners', () => {
  const r = post({ action: 'login', code: 'L6-TEST' });
  assert(r.sessions.every(s => s.canva === undefined));
});
test('quiz on a closed session is refused', () => {
  const r = post({ action: 'submitQuiz', code: 'L6-TEST', session: 1, score: 5, total: 10 });
  assert(!r.ok && /not open/.test(r.error));
});

console.log('Teacher');
test('wrong teacher code is refused', () => assert(!post({ action: 'tLogin', teacherCode: 'x' }).ok));
test('teacher signs in and sees 3 levels', () => {
  const r = post({ action: 'tLogin', teacherCode: T.toLowerCase() });
  assert(r.ok, r.error); assert.strictEqual(r.levels.length, 3);
});
test('teacher opens Session 1 with a Canva link', () => {
  const r = post({ action: 'tSetSession', teacherCode: T, level: 6, session: 1, status: 'Open', canva: 'https://www.canva.com/design/abc/view' });
  assert(r.ok, r.error);
  assert.strictEqual(r.sessions[0].status, 'Open');
  assert(r.sessions[0].openedOn);
});
test('a link that is not https is refused', () => {
  const r = post({ action: 'tSetSession', teacherCode: T, level: 6, session: 2, canva: 'javascript:alert(1)' });
  assert(!r.ok);
});
test('learner now sees Session 1 open with its link', () => {
  const r = post({ action: 'state', code: 'L6-TEST' });
  assert.strictEqual(r.sessions[0].status, 'Open');
  assert(r.sessions[0].canva.startsWith('https://www.canva.com'));
  assert.strictEqual(r.sessions[1].canva, undefined);
});
test('teacher posts an announcement; learner sees it', () => {
  assert(post({ action: 'tAnnounce', teacherCode: T, level: 6, text: 'Welcome to Level 6!' }).ok);
  const r = post({ action: 'state', code: 'L6-TEST' });
  assert.strictEqual(r.announcements[0].text, 'Welcome to Level 6!');
});
test('teacher hides the announcement; learner no longer sees it', () => {
  const id = post({ action: 'tOverview', teacherCode: T, level: 6 }).announcements[0].id;
  assert(post({ action: 'tShowAnnouncement', teacherCode: T, id, show: false }).ok);
  assert.strictEqual(post({ action: 'state', code: 'L6-TEST' }).announcements.length, 0);
});

let newCode;
test('teacher adds a learner; a code like L6-XXXXX is made', () => {
  const r = post({ action: 'tAddStudent', teacherCode: T, level: 6, name: 'Aisha Rahman', batch: 'Batch 1' });
  assert(r.ok, r.error); newCode = r.student.code;
  assert(/^L6-[A-Z2-9]{5}$/.test(newCode));
  assert(post({ action: 'login', code: newCode }).ok);
});

console.log('Submissions');
test('quiz scores are saved with attempt numbers', () => {
  assert.strictEqual(post({ action: 'submitQuiz', code: newCode, session: 1, score: 7, total: 10 }).attempt, 1);
  const r = post({ action: 'submitQuiz', code: newCode, session: 1, score: 9, total: 10 });
  assert.strictEqual(r.attempt, 2); assert.strictEqual(r.percent, 90);
  assert.strictEqual(post({ action: 'state', code: newCode }).results.quiz['1'].best, 90);
});
test('an impossible score is refused', () => assert(!post({ action: 'submitQuiz', code: newCode, session: 1, score: 11, total: 10 }).ok));
test('workbook is saved; sending again updates the same row', () => {
  const a = post({ action: 'submitWorkbook', code: newCode, session: 1, answers: { q1: 'Plan, Source, Make, Deliver, Return' } });
  const b = post({ action: 'submitWorkbook', code: newCode, session: 1, answers: { q1: 'Updated answer' } });
  assert(a.ok && b.ok); assert.strictEqual(a.id, b.id);
  assert.strictEqual(ss.sheets.Workbook.data.length, 2);
});
test('text starting with = is stored as text, not a formula', () => {
  post({ action: 'submitExit', code: newCode, session: 1, answers: { q1: '=HYPERLINK("x")' } });
  const cell = ss.sheets.Exit_Tickets.data[1][6];
  assert(cell.includes('=HYPERLINK') && cell.startsWith('{'));
  post({ action: 'tAddStudent', teacherCode: T, level: 6, name: '=1+1' });
  assert.strictEqual(ss.sheets.Students.data.at(-1)[1], "'=1+1");
});
test('teacher reads workbooks for Level 6 and marks one', () => {
  const rows = post({ action: 'tList', teacherCode: T, level: 6, tab: 'Workbook' }).rows;
  assert.strictEqual(rows.length, 1);
  assert(post({ action: 'tMark', teacherCode: T, tab: 'Workbook', id: rows[0].ID, mark: '8/10', comment: 'Good use of SCOR.' }).ok);
  const mine = post({ action: 'state', code: newCode }).results.workbook['1'];
  assert.strictEqual(mine.mark, '8/10'); assert.strictEqual(mine.comment, 'Good use of SCOR.');
});
test('lab step is saved and progress is recorded', () => {
  assert(post({ action: 'submitLab', code: newCode, step: 1, data: { company: 'Doha Fresh Imports' } }).ok);
  assert(post({ action: 'saveProgress', code: newCode, data: { sessionsDone: [1], cardsKnown: 12, quizzesTaken: 2, labSteps: 1 } }).ok);
  const p = ss.sheets.Progress.data[1];
  assert.strictEqual(p[3], 1); assert.strictEqual(p[5], 12);
  assert.deepStrictEqual(post({ action: 'state', code: newCode }).progress.sessionsDone, [1]);
});
test('overview counts things to mark', () => {
  const c = post({ action: 'tOverview', teacherCode: T, level: 6 }).counts;
  assert.strictEqual(c.workbooksToMark, 0); assert.strictEqual(c.exitToMark, 1); assert.strictEqual(c.labToMark, 1);
  assert.strictEqual(c.quizzes, 2); assert.strictEqual(c.activeThisWeek, 1);
});

console.log('Levels');
test('a Level 4 learner cannot sign in while Level 4 is Coming soon', () => {
  const code = post({ action: 'tAddStudent', teacherCode: T, level: 4, name: 'Future Learner' }).student.code;
  assert(/not open yet/.test(post({ action: 'login', code }).error));
  assert(post({ action: 'tSetLevel', teacherCode: T, level: 4, status: 'Live' }).ok);
  const r = post({ action: 'login', code });
  assert(r.ok, r.error); assert.strictEqual(r.student.level, '4'); assert.strictEqual(r.sessions.length, 0);
});
test('Level 6 lists do not include Level 4 learners', () => {
  const rows = post({ action: 'tList', teacherCode: T, level: 6, tab: 'Students' }).rows;
  assert(rows.every(r => String(r.Level) === '6'));
});
test('a deactivated learner cannot sign in', () => {
  assert(post({ action: 'tSetStudent', teacherCode: T, code: newCode, active: false }).ok);
  assert(/not active/.test(post({ action: 'login', code: newCode }).error));
});
test('unknown actions and broken requests fail safely', () => {
  assert(!post({ action: 'deleteEverything' }).ok);
  assert(!JSON.parse(ctx.doPost({ postData: { contents: '{bad' } }).body).ok);
});


console.log('Learner details');
test('setup adds the new Email/Phone columns to an old Students tab without losing data', () => {
  const sh = ss.sheets.Students;
  const before = sh.data.length;
  sh.data[0] = ['Code', 'Name', 'Level', 'Batch', 'Active', 'Created']; // an old Sheet
  ctx.setup();
  assert.deepStrictEqual(sh.data[0].slice(6), ['Email', 'Phone', 'WhatsApp', 'Details updated']);
  assert.strictEqual(sh.data.length, before);
});
test('a new learner has empty details; saving them works and is returned on sign-in', () => {
  const code = post({ action: 'tAddStudent', teacherCode: T, level: 6, name: 'Noor Khan' }).student.code;
  assert.strictEqual(post({ action: 'login', code }).student.email, '');
  const r = post({ action: 'saveProfile', code, email: ' Noor.Khan@Example.com ', phone: '+974 5512 3456', whatsapp: '' });
  assert(r.ok, r.error);
  const st = post({ action: 'login', code }).student;
  assert.strictEqual(st.email, 'noor.khan@example.com'); assert.strictEqual(st.phone, '+97455123456');
});
test('bad email or phone is refused with a clear message', () => {
  const code = post({ action: 'tAddStudent', teacherCode: T, level: 6, name: 'Test Two' }).student.code;
  assert(/email/.test(post({ action: 'saveProfile', code, email: 'not-an-email', phone: '55123456' }).error));
  assert(/mobile/.test(post({ action: 'saveProfile', code, email: 'a@b.qa', phone: '12' }).error));
  assert(/mobile number/.test(post({ action: 'saveProfile', code, email: 'a@b.qa', phone: '' }).error));
});
test('teacher sees and can edit learner details', () => {
  const s = post({ action: 'tOverview', teacherCode: T, level: 6 }).students.find(x => x.name === 'Noor Khan');
  assert.strictEqual(s.phone, '+97455123456');
  assert(post({ action: 'tSetStudent', teacherCode: T, code: s.code, whatsapp: '+97466000000' }).ok);
  assert.strictEqual(post({ action: 'login', code: s.code }).student.whatsapp, '+97466000000');
});

console.log(`\n${passed} tests passed` + (process.exitCode ? ' — SOME FAILED' : ''));
