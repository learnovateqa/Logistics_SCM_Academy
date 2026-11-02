# Logistics & Supply Chain Management Academy

Elevate with Ms. Maria · Learnovate Qatar

Course website and teacher portal. Level 6 is live; Levels 4 and 5 will be added later as separate programmes on the same site.

## What is in this repository

```
apps-script/
  Code.gs            the Google Sheet back end (paste into Extensions > Apps Script)
  SETUP-GUIDE.md     step-by-step setup on a MacBook
  test/              automatic tests for Code.gs (node apps-script/test/run-tests.js)
assets/tools.js      the calculators (tests: node tests/tools.test.js)
tests/content.test.js  checks every session file (node tests/content.test.js)
levels/level6/cases.json   case studies (Qatar 2017, Hamad Port, Ever Given, Red Sea, workplace cases)
index.html           the student app (sign in, Home, Sessions, Progress, Study…)
assets/              app.css and app.js (no framework)
levels/levels.json   the list of levels and their card titles (Level 6 has content; 4 and 5 show as ready programmes, content to come)
levels/level6/       course.json (12 sessions) + one file per session (s01.json…)
manifest.webmanifest, sw.js, icons/   installable app, works offline
config.js            the Web app link from Apps Script goes here
setup/check.html     connection check: is the site talking to the Sheet?
docs/PLAN.md         syllabus, colours, build order and interactive specs (teacher reference)
```

## Adding a level later

1. Put its content in `levels/level4/` (a `course.json` and one file per session, like Level 6).
2. In `levels/levels.json`, set `"content": true` for that level.
3. In the Sheet: Levels tab → Status **Live**, add its sessions and learners. No code changes.

## Rules

- The site is public. Never upload exam papers, answer keys, grades, learner names or the textbook.
- Learner data lives only in the Google Sheet.
