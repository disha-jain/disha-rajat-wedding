// Free RSVP email notifier — GitHub Actions cron poller.
//
// Why this exists: the Cloud Function draft in ../functions needs the Blaze
// (pay-as-you-go) plan, and the Trigger Email extension needs Blaze too.
// This does the same job for $0: a scheduled GitHub Actions workflow
// (free + unlimited on public repos) polls Firestore every 15 minutes,
// groups a family's RSVP into ONE email, and sends it via Gmail SMTP.
//
// How it detects a submission: the site writes one `rsvps` doc per
// guest+event, all sharing the same `timestamp` for one submit
// (home.html builds one timestamp per submit). Un-notified docs are
// grouped by (family_code, timestamp); each group = one email. Docs are
// then marked `notified: true`, so they are never emailed twice. An edit
// re-saves the same doc IDs with a new timestamp (batch.set overwrites,
// wiping the flag), so edits notify again as "RSVP updated".
//
// Only docs from the last WINDOW_HOURS are considered, so the first run
// does not email about months of old RSVPs.
//
// Env (set as GitHub repo secrets — never commit them):
//   FIREBASE_SERVICE_ACCOUNT_JSON — service-account JSON for project
//       disha-rajat-wedding (Firebase console > Project settings >
//       Service accounts > Generate new private key). Admin SDK bypasses
//       Firestore rules, so no rules change is needed.
//   SMTP_USER — Gmail address the mail is sent from
//       (e.g. khanna.rjt@gmail.com)
//   SMTP_PASS — Gmail app password for that account (Google Account >
//       Security > 2-Step Verification > App passwords). NOT your login
//       password.
//   NOTIFY_EMAILS — comma-separated recipients, e.g.
//       "khanna.rjt@gmail.com,dishajain2016@gmail.com"
//       (Default: both Rajat and Disha.)
//   WINDOW_HOURS — how far back to look each run (default 3).

const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

const WINDOW_HOURS = Number(process.env.WINDOW_HOURS || 3);
const NOTIFY_EMAILS =
  process.env.NOTIFY_EMAILS ||
  "khanna.rjt@gmail.com,dishajain2016@gmail.com";
const ADMIN_URL =
  "https://disha-jain.github.io/disha-rajat-wedding/admin.html";

// Pure helpers (exported for test-notify.js) -------------------------------

// Group un-notified docs into submissions: one group per (family, timestamp).
function groupSubmissions(docs) {
  const groups = new Map();
  for (const d of docs) {
    if (!d || d.notified === true) continue;
    if (!d.family_code || !d.timestamp) continue;
    const key = `${d.family_code}|${d.timestamp}`;
    if (!groups.has(key)) {
      groups.set(key, {
        family_code: d.family_code,
        family_name: d.family_name || d.family_code,
        timestamp: d.timestamp,
        docs: [],
      });
    }
    groups.get(key).docs.push(d);
  }
  return [...groups.values()];
}

function buildEmailText(group, isUpdate) {
  const verb = isUpdate ? "RSVP updated" : "New RSVP";
  const byGuest = {};
  for (const r of group.docs) {
    const g = (byGuest[r.guest_name] = byGuest[r.guest_name] || {
      guest_name: r.guest_name,
      phone: r.phone,
      events: [],
    });
    g.events.push({ event_title: r.event_title, status: r.status });
  }
  const dietary = [
    ...new Set(
      group.docs
        .map((r) => (r.dietary_notes || "").trim())
        .filter(Boolean)
    ),
  ].join("; ");
  const lines = Object.values(byGuest).map((g) => {
    const perEvent = g.events
      .map((e) => `  - ${e.event_title}: ${e.status}`)
      .join("\n");
    return `${g.guest_name}${g.phone ? ` (${g.phone})` : ""}\n${perEvent}`;
  });
  return {
    subject: `${verb} — ${group.family_name}`,
    text:
      `${verb}: ${group.family_name} (${group.family_code})\n` +
      `Submitted: ${group.timestamp}\n\n` +
      lines.join("\n\n") +
      (dietary ? `\n\nDietary / wishes: ${dietary}` : "") +
      `\n\nView in admin: ${ADMIN_URL}`,
  };
}

// Live run -----------------------------------------------------------------

async function main() {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}"
  );
  if (!serviceAccount.private_key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON secret is missing or not valid JSON"
    );
  }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP_USER / SMTP_PASS secrets are missing");
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  const db = admin.firestore();

  const cutoff = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000)
    .toISOString()
    .slice(0, 23) + "Z";
  const snap = await db
    .collection("rsvps")
    .where("timestamp", ">", cutoff)
    .orderBy("timestamp")
    .get();
  const docs = snap.docs.map((d) => ({ id: d.ref.path, ...d.data() }));
  const groups = groupSubmissions(docs);
  console.log(
    `Found ${docs.length} recent rsvps docs in ${groups.length} un-notified submission(s).`
  );
  if (!groups.length) return;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  for (const group of groups) {
    // New vs updated: has this family had a notified submission before?
    const earlier = await db
      .collection("rsvps")
      .where("family_code", "==", group.family_code)
      .where("notified", "==", true)
      .limit(1)
      .get();
    const { subject, text } = buildEmailText(group, !earlier.empty);
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: NOTIFY_EMAILS.split(",").map((s) => s.trim()).join(", "),
      subject,
      text,
    });
    console.log(`Emailed: ${subject} (${group.docs.length} docs)`);
    const batch = db.batch();
    for (const r of group.docs) {
      batch.update(db.doc(r.id), { notified: true });
    }
    await batch.commit();
  }
  console.log("Done.");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { groupSubmissions, buildEmailText };
