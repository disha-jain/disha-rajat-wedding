# RSVP email notifications (free — GitHub Actions poller)

No Blaze plan, no Cloud Function, no cost. A scheduled GitHub Actions
workflow polls Firestore every 15 minutes and emails one summary per
RSVP submission via the SendGrid API. No Gmail app password needed.

Based on Rajat Khanna's PR #3, with the new-vs-updated detection fixed
(see "How it works" — the notified flag cannot live on the RSVP docs)
and Gmail SMTP replaced by SendGrid.

## What it costs

$0. GitHub Actions is free and unlimited on public repositories, and
this repo is public. SendGrid's free tier is 100 emails/day (no credit
card, no expiry) — far above RSVP volume. The tradeoff vs a Cloud
Function is delay: emails arrive up to ~15 minutes after the RSVP (plus
GitHub cron can slip 5–30 minutes under load), not instantly.

## Files

- `notify-rsvps.js` — the poller (run by the workflow)
- `package.json` / `package-lock.json` — deps: firebase-admin only
  (SendGrid is called with Node's built-in fetch, no SDK needed)
- `test-notify.js` — mock-data tests for the grouping, marker planning,
  email logic and SendGrid payload (`npm install && node test-notify.js`;
  no Firestore or SendGrid needed)
- `.github/workflows/rsvp-notify.yml` — cron `7,22,37,52 * * * *` +
  manual `workflow_dispatch` trigger

No change to the site itself: no `home.html` edit, no Firestore rules
change. The Admin SDK reads/writes Firestore directly, bypassing rules.

## Setup (in order)

1. **SendGrid account (free)** — sign up at sendgrid.com (free plan,
   100 emails/day, no credit card). Verify your email when prompted.
2. **Verify the sender address** — SendGrid dashboard > Settings >
   Sender Authentication > Verify a Single Sender. Use the address the
   mail should come from, e.g. `dishajain2016@gmail.com` (a Gmail
   address is fine). Fill in the form, then click the verification link
   SendGrid emails to that address. The workflow cannot send until the
   sender is verified.
3. **API key** — Settings > API Keys > Create API Key. Name it e.g.
   "Wedding RSVP notifier", choose **Restricted Access** with only
   **Mail Send** enabled (or Full Access). Copy the key immediately —
   it is shown once and starts with `SG.`.
4. **Service account key** — whoever owns the Firebase project
   (`disha-rajat-wedding`): Firebase console > Project settings >
   Service accounts > Generate new private key. This key can read/write
   the whole Firestore database — treat it like a password.
5. **Repo secrets** — repo Settings > Secrets and variables > Actions >
   New repository secret (only a repo admin can do this):
   - `FIREBASE_SERVICE_ACCOUNT_JSON` — entire contents of the JSON key
     file from step 4
   - `SENDGRID_API_KEY` — the key from step 3
   - `SENDGRID_FROM` — the verified sender address from step 2
   - `NOTIFY_EMAILS` — `khanna.rjt@gmail.com,dishajain2016@gmail.com`
6. **Test** — Actions tab > "RSVP email notifications" > Run workflow,
   then submit a test RSVP on the live site. An email should arrive
   within ~15 minutes. Edit the same RSVP and confirm a second email
   arrives with subject "RSVP updated". Delete the test `rsvps` docs
   afterwards (and the family's `rsvp_notify` marker doc if you want
   the next test to read "New RSVP" again).

## How it works

- Each run queries `rsvps` docs with `timestamp` in the last 24 hours
  (`WINDOW_HOURS`, default 24) — so the first run never emails about
  months of old RSVPs, while an Actions outage of a few hours does not
  silently skip any. In normal operation the digest covers roughly the
  last 15 minutes (the cron interval); if a run fails, the next run's
  digest includes the backlog.
- Un-notified docs are grouped by `(family_code, timestamp)`: one
  submit writes all its docs with one shared timestamp, so one group =
  one digest section, not ~20.
- One email per run, subject **"Wedding Guest RSVP Updates"**, with a
  section per family: "New RSVP: {family} ({code}) — {side}" or
  "RSVP updated: ..." for an edit, then each guest with their events
  and statuses, dietary notes, and the admin link once at the end.
  `{side}` is the family's bride-side / groom-side tag (or both),
  taken from the `families` doc — tags live on the members, so the
  family's side is the union of its members' tags, exactly as the
  site computes session tags. Families with neither side tag show no
  side.
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
- After the digest is sent, every emailed timestamp is added to its
  family's marker with `arrayUnion` (one batch write), so no group is
  ever emailed twice. If sending fails (e.g. SendGrid returns anything
  other than 202), no marker is written and the next run retries the
  whole digest.
- Logs: every run prints how many docs/groups it found and what it
  emailed; failures show red in the Actions tab.

## Things to know

- GitHub auto-disables a schedule after 60 days with no repository
  activity. If the repo goes quiet, any commit re-enables it.
- The workflow file and script are public (public repo) — they contain
  no secrets. All credentials live only in repo Secrets.
- If a SendGrid send fails with 403, the sender address is usually not
  verified yet (step 2). If it fails with 401, the API key is wrong or
  was regenerated.
