/* Checks every session file is complete and consistent.
 * Run: node tests/content.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const levels = JSON.parse(fs.readFileSync(path.join(root, 'levels/levels.json'), 'utf8')).levels;
let checks = 0, problems = [];
function check(ok, msg) { checks++; if (!ok) problems.push(msg); }

const BOOK = /\b(chapter|ch\.|page|p\.\s?\d|textbook|the book)\b/i; // learner pages must not cite the book

levels.filter(l => l.content).forEach(l => {
  const dir = path.join(root, l.path);
  const course = JSON.parse(fs.readFileSync(path.join(dir, 'course.json'), 'utf8'));
  check(course.sessions.length === 12, `${l.name}: 12 sessions`);
  course.sessions.forEach(s => {
    check(['Plan', 'Source', 'Make', 'Deliver', 'Return'].includes(s.stage), `S${s.n}: valid stage`);
    if (!s.file) return;
    const file = path.join(dir, s.file);
    check(fs.existsSync(file), `S${s.n}: ${s.file} exists`);
    const raw = fs.readFileSync(file, 'utf8');
    const c = JSON.parse(raw);
    const tag = `${l.name} S${s.n}`;
    check(c.n === s.n, `${tag}: n matches`);
    check(Array.isArray(c.goals) && c.goals.length >= 3, `${tag}: goals`);
    check(c.handout && c.handout.sections.length >= 3, `${tag}: handout sections`);
    check(!BOOK.test(raw), `${tag}: no book references`);
    c.handout.sections.forEach((sec, i) => check(sec.h && sec.blocks.length, `${tag}: section ${i + 1} has a title and content`));
    check(Array.isArray(c.quiz) && c.quiz.length >= 8, `${tag}: at least 8 quiz questions`);
    c.quiz.forEach((q, i) => {
      check(q.options.length === 4, `${tag} Q${i + 1}: 4 options`);
      check(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length, `${tag} Q${i + 1}: answer index valid`);
      check(new Set(q.options).size === q.options.length, `${tag} Q${i + 1}: options are different`);
      check(q.why && q.why.length > 10, `${tag} Q${i + 1}: has an explanation`);
    });
    if (s.type === 'Teaching') {
      check(c.terms && c.terms.length >= 10, `${tag}: at least 10 key terms`);
      check(c.workbook && c.workbook.questions.length >= 4, `${tag}: workbook`);
      check(c.exit && c.exit.questions.length >= 2, `${tag}: exit ticket`);
      const ids = c.workbook.questions.map(q => q.id);
      check(new Set(ids).size === ids.length, `${tag}: workbook ids unique`);
      const terms = c.terms.map(t => t.term.toLowerCase());
      check(new Set(terms).size === terms.length, `${tag}: key terms unique`);
    }
  });
});

if (problems.length) { console.error(problems.map(p => '  FAIL ' + p).join('\n')); process.exit(1); }
console.log(`${checks} content checks passed`);
