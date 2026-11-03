# Sending midterm and final scores to the dashboard

You make your own midterm and final pages (HTML). This page shows how to link them to the course website and send each learner's score to the teacher dashboard.

## 1. Put the exam on the course website

1. Upload your exam page, for example to GitHub Pages, and copy its link (it must start with `https://`).
2. Open the **teacher portal → Grades → Exams**.
3. Paste the link under *Midterm exam* or *Final exam* and press **Save link**.
4. On exam day, tap the switch so it says **Open: learners can see it**.

Learners now see a gold **Start the midterm exam** button on Home and on Session 6 (Session 12 for the final). The button opens your page in a new tab and adds the learner's code and name to the link, like this:

```
https://…/midterm.html?code=L6-AB123&name=Sara%20Ali
```

Tap the switch again after the exam to hide the button.

## 2. Add this code to your exam page

Paste this just before `</body>` in your exam HTML. Change `LSCM_EXAM` to `'final'` in the final exam page.

```html
<script>
  // Elevate with Ms. Maria · LSCM: send this exam's score to the course dashboard.
  var LSCM_SCRIPT = 'https://script.google.com/macros/s/AKfycby_1nN3_oRP6-PYWL73kv5xq4nxSsohGoZGxk0dL1Unv7NCU1IshsBcRMxJhHjhIe2C1Q/exec';
  var LSCM_EXAM = 'midterm'; // 'midterm' or 'final'

  // Who is taking the exam (from the link on the course website)
  var LSCM_PARAMS = new URLSearchParams(location.search);
  var LSCM_CODE = LSCM_PARAMS.get('code') || '';
  var LSCM_NAME = LSCM_PARAMS.get('name') || '';

  // Call this once when the learner finishes: lscmSendScore(score, total)
  function lscmSendScore(score, total) {
    if (!LSCM_CODE) {
      alert('Please open this exam from the course website, so your score can be saved.');
      return Promise.resolve(null);
    }
    return fetch(LSCM_SCRIPT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'submitExam', code: LSCM_CODE, exam: LSCM_EXAM, score: score, total: total })
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'The score was not saved.');
      return j; // j.percent, j.counted (true for the first attempt), j.attempt
    });
  }
</script>
```

Then, in the part of your page that marks the exam, call it with the learner's score:

```js
lscmSendScore(42, 50)
  .then(function (r) { if (r) alert('Your score was sent to Ms. Maria: ' + r.percent + '%'); })
  .catch(function (e) { alert('Your score could not be sent: ' + e.message + ' Please tell Ms. Maria.'); });
```

## Good to know

- **Only the first attempt goes into Grades.** Later attempts are listed in *Grades → Exams → Scores received*, marked "–" under *In Grades*.
- **A score is only accepted while the exam is open.** When the switch says *Hidden from learners*, scores are refused.
- **You can always correct a grade by hand:** type over the Midterm or Final value in *Grades* and press **Save grades**.
- **Keep the answer key out of the exam page.** Anyone can read a web page's code. A page that marks itself has its answers in the code, so a learner who knows how could find them. For a high-stakes exam, mark the long answers yourself and type the score into *Grades*.
- **The score is a percentage** (score ÷ total × 100) in the Midterm or Final column, and the weights in *Grades → Weights* apply as usual.
