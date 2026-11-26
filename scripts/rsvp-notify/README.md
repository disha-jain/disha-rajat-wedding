# RSVP email notifications (free — GitHub Actions poller)

No Blaze plan, no Cloud Function, no cost. A scheduled GitHub Actions
workflow polls Firestore every 15 minutes and emails one summary per
RSVP submission via Gmail SMTP.

Based on Rajat Khanna's PR #3, with the new-vs-updated detection fixed
(see "How it works" — the notified flag cannot live on the RSVP docs).

## What it costs

$0. GitHub Actions is free and unlimited on public repositories, and
this repo is public. Gmail SMTP is free. The tradeoff vs a Cloud
Function is delay: emails arrive up to ~15 minutes after the RSVP (plus
GitHub cron can slip 5–30 minutes under load), not instantly.

## Files

- `notify-rsvps.js` — the poller (run by the workflow)
- `package.json` / `package-lock.json` — deps: firebase-admin, nodemailer
- `test-notify.js` — mock-data tests for the grouping, marker planning
  and email logic (`npm install && node test-notify.js`; no Firestore
  or SMTP needed)
- `.github/workflows/rsvp-notify.yml` — cron `7,22,37,52 * * * *` +
  manual `workflow_dispatch` trigger

No change to the site itself: no `home.html` edit, no Firestore rules
change. The Admin SDK reads/writes Firestore directly, bypassing rules.

## Setup (in order)

1. **Merge this PR** into `main`. Scheduled workflows only run on the
   default branch.
2. **Service account key** — whoever owns the Firebase project
   (`disha-rajat-wedding`): Firebase console > Project settings >
   Service accounts > Generate new private key. This key can read/write
   the whole Firestore database — treat it like a password.
3. **Gmail app password** — Rajat: Google Account > Security >
   2-Step Verification (must be on) > App passwords > create one named
   e.g. "Wedding RSVP notifier". This is a 16-character code, not the
   Gmail login password.
4. **Repo secrets** — repo Settings > Secrets and variables > Actions >
   New repository secret (only a repo admin can do this):
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — entire contents of the JSON key
     file from step 2
   - `SMTP_USER` — `khanna.rjt@gmail.com`
   - `SMTP_PASS` — the app password from step 3
   - `NOTIFY_EMAILS` — `khanna.rjt@gmail.com,dishajain2016@gmail.com`
5. **Test** — Actions tab > "RSVP email notifications" > Run workflow,
   then submit a test RSVP on the live site. An email should arrive
   within ~15 minutes. Edit the same RSVP and confirm a second email
   arrives with subject "RSVP updated". Delete the test `rsvps` docs
   afterwards (and the family's `rsvp_notify` marker doc if you want
   the next test to read "New RSVP" again).

## How it works

- Each run queries `rsvps` docs with `timestamp` in the last 24 hours
  (`WINDOW_HOURS`, default 24) — so the first run never emails about
  months of old RSVPs, while an Actions outage of a few hours does not
  silently skip any.
- Un-notified docs are grouped by `(family_code, timestamp)`: one
  submit writes all its docs with one shared timestamp, so one group =
  one email, not ~20.
- Notification state lives in a separate `rsvp_notify` collection, one
  doc per family: `{ notified_timestamps: [...], updated_at }`. A group
  whose timestamp is already in the marker was emailed before and is
  skipped; a new timestamp is emailed, labelled "RSVP updated" when the
  family has any earlier notified timestamp, "New RSVP" otherwise.
- Why not a `notified` flag on the RSVP docs? The site re-saves every
  RSVP doc on each submit with `batch.set` (full overwrite), which
  wipes such a flag — so after an edit no notified doc would survive
  and every edit would be mislabelled "New RSVP". The marker doc is
  never touched by the site, so it survives re-saves.
- After emailing a group, its timestamp is added to the family's
  marker with `arrayUnion`, so it is never emailed twice. If sending
  fails, the marker is untouched and the next run retries.
- Logs: every run prints how many docs/groups it found and what it
  emailed; failures show red in the Actions tab.

## Things to know

- GitHub auto-disables a schedule after 60 days with no repository
  activity. If the repo goes quiet, any commit re-enables it.
- The workflow file and script are public (public repo) — they contain
  no secrets. All credentials live only in repo Secrets.
