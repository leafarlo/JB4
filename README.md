# 🌿 Jardin Botanique 4 — House Dashboard

Live dashboard + automated weekly email reminders for all 23 residents.

---

## 📁 File structure

```
├── index.html              ← The dashboard (open in browser or host on GitHub Pages)
├── residents.json          ← All resident data, emails, group assignments, trash schedule
├── send-reminders.js       ← The email script (run by GitHub Actions)
├── package.json
└── .github/
    └── workflows/
        └── weekly-reminders.yml  ← GitHub Actions: runs every Sunday at 18:00
```

---

## 🚀 One-time setup (takes ~15 minutes)

### Step 1 — Create a Gmail account for the house

Create a dedicated Gmail: e.g. `jb4brussels@gmail.com`
(Using your personal Gmail works too, but a shared house account is cleaner.)

### Step 2 — Create a Gmail App Password

Gmail requires an "App Password" instead of your normal password for scripts.

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → **2-Step Verification** → turn ON (required)
3. Security → search **"App passwords"**
4. Create one: App = "Mail", Device = "Other" → name it "JB4 Reminders"
5. Copy the 16-character password — you'll need it in Step 4

### Step 3 — Push this project to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/jb4-dashboard.git
git push -u origin main
```

### Step 4 — Add secrets to GitHub

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

Add these two secrets:

| Secret name      | Value                              |
|------------------|------------------------------------|
| `GMAIL_USER`     | `jb4brussels@gmail.com`            |
| `GMAIL_APP_PASS` | `abcd efgh ijkl mnop` (your app pw)|

### Step 5 — Enable GitHub Pages (for the dashboard)

Repo → **Settings → Pages → Source: Deploy from branch → main → / (root)**

Your dashboard will be live at:
`https://YOUR_USERNAME.github.io/jb4-dashboard/`

---

## 👥 Managing residents

**When someone moves out / in:**

1. Open `residents.json`
2. Find their room number
3. Change `"name"` and `"email"`
4. Commit and push — done. No other files need changing.

```json
{ "room": "203", "name": "New Person", "email": "newperson@gmail.com" }
```

The dashboard also lets you edit names live in the Residents tab (visual only — doesn't save to the JSON file).

---

## 📅 Updating the trash schedule

When the commune sends new collection dates, add them to `residents.json` under `"trashSchedule"`:

```json
{ "date": "2025-07-07", "type": "blue", "label": "Blue bags (PMC)" }
```

Types: `blue` · `yellow` · `green` · `glass` · `bulk`

---

## 🔁 How the automation works

Every **Sunday at 18:00 Brussels time**, GitHub Actions:

1. Reads `residents.json`
2. Calculates which group is on trash duty this week (rotating every 5 weeks)
3. Calculates which group is on dishwasher duty
4. Sends a personalized HTML email to each member of both groups
5. Sends a summary email to the ambassador

**Each person receives only their own group's email.**

---

## ▶️ Running manually

From the **GitHub Actions tab** → `Weekly Duty Reminders` → `Run workflow`

You can also trigger a dry run (logs only, no emails sent) by selecting `dry_run: true`.

Or locally:
```bash
npm install
GMAIL_USER=jb4brussels@gmail.com GMAIL_APP_PASS=yourapppass node send-reminders.js
```

---

## 💬 WhatsApp reminders (manual)

The dashboard has a **"Reminder"** button on every calendar card and in the Residents tab.
Click it → copy the pre-written message → paste into your WhatsApp group. Done in 3 seconds.

Full WhatsApp automation (Meta Business API) is possible but requires business verification
and costs ~€0.05/message. Not worth it for a house — email automation is the right tool here.

---

## 🆘 Troubleshooting

**Emails not sending?**
- Check Actions tab for error logs
- Verify both secrets are set correctly (no spaces around the value)
- Make sure 2-Step Verification is ON on the Gmail account
- App Passwords only work if 2FA is enabled

**Wrong group getting emails?**
- Check `referenceMonday` in `residents.json` — it must be a Monday date
- The rotation is: G1 → G2 → G3 → G4 → G5 → G1 … starting from that date

**GitHub Actions not running on schedule?**
- GitHub can delay scheduled workflows by up to 1 hour during high load
- The repo must have had activity in the past 60 days (GitHub disables cron on inactive repos)
- To keep it active, just push any small change monthly (e.g. update the trash schedule)
