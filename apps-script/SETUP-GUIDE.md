# Set up the teacher Sheet (on your MacBook)

**Time:** about 15 minutes, once only.
**You need:** your Google account, and Safari or Chrome.

The Sheet is your teacher portal. One Sheet covers every level: Level 6 now, and Levels 4 and 5 later.

---

## Part A: Create the Sheet

1. Go to **sheets.new**. A new, empty Google Sheet opens.
2. Click **Untitled spreadsheet** (top left) and type:
   `LSCM Academy – Teacher Sheet`
3. Press **Return**.

## Part B: Add the script

1. In the Sheet menu, click **Extensions → Apps Script**. A new tab opens.
2. Click **Untitled project** (top left) and type: `LSCM Academy`. Click **Rename**.
3. In a new tab, open the script file on GitHub:
   **github.com/learnovateqa/Logistics_SCM_Academy/blob/main/apps-script/Code.gs**
4. Click the **Copy raw file** button (two small squares, top right of the code).
5. Go back to the Apps Script tab. Click inside the code area and select all the code that is already there (**⌘ + A**). Then paste (**⌘ + V**). The old code is replaced.
6. Save (**⌘ + S**).

## Part C: Run setup (creates the 10 tabs)

1. At the top of the code, find the box that shows a function name. Choose **setup**.
2. Click **▶ Run**.
3. Google asks for permission the first time:
   1. Click **Review permissions**.
   2. Choose your Google account.
   3. If you see **"Google hasn't verified this app"**, click **Advanced**, then **Go to LSCM Academy (unsafe)**. This is normal for your own script.
   4. Click **Allow**.
4. Wait for **"Execution completed"** at the bottom.
5. Go back to the Sheet tab. You now see 10 tabs: Settings, Levels, Students, Sessions, Announcements, Quiz_Scores, Workbook, Exit_Tickets, Lab, Progress.
6. Open the **Settings** tab. Your **teacher code** is in the Value column, for example `MARIA-7KQ2TX`. You can change it to your own code (letters, numbers and dashes only).

## Part D: Publish the script as a web app

1. In the Apps Script tab, click the blue **Deploy** button (top right), then **New deployment**.
2. Click the **gear icon** next to "Select type", then choose **Web app**.
3. Fill in:
   - **Description:** `version 1`
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**. If Google asks for permission again, allow it as in Part C.
5. Copy the **Web app URL**. It starts with `https://script.google.com/macros/s/` and ends with `/exec`.

"Anyone" means the site can reach the script. It does not open your Sheet to anyone. Learners can only do what the script allows, and only with a valid code.

## Part E: Test it (2 minutes)

Paste each link into a new browser tab. Replace `YOUR-LINK` with the link from Part D.

| Test | Paste this | You should see |
|---|---|---|
| 1. The script answers | `YOUR-LINK` | `"ok":true` and a version number |
| 2. The test learner can sign in | `YOUR-LINK?action=login&code=L6-TEST` | `"ok":true`, `"name":"Test Learner"` and 12 sessions |

If both work, **send me the Web app link**. I'll add it to the site in `config.js`.

## Part F: Everyday use

You will mostly use the **teacher portal**: https://learnovateqa.github.io/Logistics_SCM_Academy/teacher.html (sign in with your teacher code). You can also do everything in the Sheet:

| To… | Do this in the Sheet |
|---|---|
| Open a session | **Sessions** tab → Status column → choose **Open** |
| Add the Canva deck | **Sessions** tab → paste the Canva share link in **Canva link** |
| Add a learner | **Students** tab → new row: Code (e.g. `L6-AHMED`), Name, Level `6`, Batch, Active `Yes` |
| Stop a learner's access | **Students** tab → Active → **No** |
| Read workbooks | **Workbook** tab (one row per learner per session) |
| Attendance and grades | **Attendance** and **Grades** tabs (easier in the portal: Attendance and Grades pages) |
| Grade weights, show/hide grades | **Settings** tab: W_MIDTERM, W_FINAL, W_WORKBOOKS, W_ATTENDANCE, W_PARTICIPATION (add up to 100), SHOW_GRADES Yes/No |
| E-workbook scores | **Workbook** tab: **Score** / **Total** = auto-scored tasks; **Mark** = your mark for the written part (e.g. 8/10) |
| Midterm and final links | Teacher portal → **Grades → Exams** (see `EXAM-SCORES.md`). Scores arrive in the **Exams** tab |
| Start Level 4 or 5 later | **Levels** tab → Status → **Live**, then add its sessions and learners |

**Never delete or rename the tabs or the header row.** The script finds everything by those names.

## Updating the script to a new version

When Claude gives you a new version of the script (version 1.1 added learners’ email and phone; version 1.2 added attendance and grades; version 1.3 added e-workbook scores and exam links; version 1.4 shows the grade weights on learners’ Progress page):

1. Open your Sheet → **Extensions → Apps Script**.
2. Open **github.com/learnovateqa/Logistics_SCM_Academy/blob/main/apps-script/Code.gs**, click **Copy raw file**.
3. In Apps Script, click in the code, **⌘ + A**, then **⌘ + V**, then **⌘ + S**.
4. Choose **setup** in the function box and click **▶ Run**. This adds any new columns. It never deletes data.
5. Click **Deploy → Manage deployments → pencil ✏️ → Version: New version → Deploy**. The link stays the same.
6. Check: open your Web app link. It should show the new version number (for example `"version":"1.1.0"`).

## If you change the script later

Use **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**.
This keeps the **same** link. Choosing "New deployment" would make a new link, and the site would stop working until the link is updated.

## Problems

| You see | Fix |
|---|---|
| "The Students tab is missing. Run setup()…" | Run **setup** again (Part C). It never deletes data. |
| "This code was not found" | Check the code in the Students tab. Codes are not case-sensitive. |
| "Your level is not open yet" | In the **Levels** tab, set that level's Status to **Live**. |
| "This session is not open yet" | In the **Sessions** tab, set Status to **Open**. |
| A Google sign-in page instead of `"ok":true` | In Part D, **Who has access** must be **Anyone**. Edit it under Manage deployments. |
