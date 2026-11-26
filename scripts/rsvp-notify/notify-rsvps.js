// Free RSVP email notifier — GitHub Actions cron poller.
//
// Why this exists: the Cloud Function and Trigger Email extension routes
// both need the Firebase Blaze (pay-as-you-go) plan, so this uses a
// scheduled GitHub Actions workflow instead. Cost is $0 (Actions is free
// and unlimited on public repos; SendGrid's free tier is 100 emails/day).
// Tradeoff: emails arrive up to ~15 minutes after the RSVP, not instantly.
//
// What it sends: ONE digest email per run, subject "Wedding Guest RSVP
// Updates", summarising every submission that arrived since the last run
// (one section per family). Each section is headed "New RSVP: {family}
// ({code}) — {side}" or "RSVP updated: ..." where {side} is the family's
// bride-side / groom-side tag (or both), read from the `families` doc.
//
// How it detects a submission: the site writes one `rsvps` doc per
// guest+event, all sharing the same `timestamp` for one submit
// (home.html builds one timestamp per submit). Un-notified groups are
// found by (family_code, timestamp); each group = one digest section.
//
// Why notification state lives OUTSIDE the rsvps docs: the site re-saves
// every RSVP doc on each submit with batch.set (full overwrite), which
// would wipe a `notified` flag written onto those docs — so a flag on the
// rsvps docs can never tell a first submit from an edit. Instead the
// poller keeps one marker doc per family in `rsvp_notify`
// (`{ notified_timestamps: [...], updated_at }`). A group whose timestamp
// is already in the marker was emailed before and is skipped; a group
// with a new timestamp is emailed, labelled "RSVP updated" when the
// family has any earlier notified timestamp, "New RSVP" otherwise.
//
// Only docs from the last WINDOW_HOURS are considered, so the first run
// does not email about months of old RSVPs. In normal operation the
// digest covers roughly the last 15 minutes (the cron interval); if a
// run fails, the next run's digest includes the backlog.
//
// Env (set as GitHub repo secrets — never commit them):
//   FIREBASE_SERVICE_ACCOUNT_JSON — service-account JSON for project
//       disha-rajat-wedding (Firebase console > Project settings >
//       Service accounts > Generate new private key). Admin SDK bypasses
//       Firestore rules, so no rules change is needed.
//   SENDGRID_API_KEY — SendGrid API key with Mail Send permission
//       (SendGrid dashboard > Settings > API Keys > Create API Key).
//       Shown once — copy it immediately. Starts with "SG.".
//   SENDGRID_FROM — the sender address, which must be a verified
//       Single Sender in SendGrid (Settings > Sender Authentication >
//       Verify a Single Sender) — e.g. dishajain2016@gmail.com.
//   NOTIFY_EMAILS — comma-separated recipients, e.g.
//       "khanna.rjt@gmail.com,dishajain2016@gmail.com"
//       (Default: both Rajat and Disha.)
//   WINDOW_HOURS — how far back to look each run (default 24).

const admin = require("firebase-admin");

const WINDOW_HOURS = Number(process.env.WINDOW_HOURS || 24);
const NOTIFY_EMAILS =
  process.env.NOTIFY_EMAILS ||
  "khanna.rjt@gmail.com,dishajain2016@gmail.com";
const ADMIN_URL =
  "https://disha-jain.github.io/disha-rajat-wedding/admin.html";
const MARKER_COLLECTION = "rsvp_notify";
const SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";
const DIGEST_SUBJECT = "Wedding Guest RSVP Updates";

// Pure helpers (exported for test-notify.js) -------------------------------

// Group docs into submissions: one group per (family, timestamp).
function groupSubmissions(docs) {
  const groups = new Map();
  for (const d of docs) {
    if (!d || !d.family_code || !d.timestamp) continue;
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

// Decide what to do with each group, given the families' marker docs.
// markers: Map family_code -> { notified_timestamps: [...] } (or missing).
// Returns [{ group, action: "email" | "skip", isUpdate }], in group order.
// A group already in its family's marker was emailed before: skip it.
// A new group is emailed; it is an update when the family has any earlier
// notified timestamp. Groups are planned in order, so a second group for
// the same family in one run is an update of the first.
function planNotifications(groups, markers) {
  const seen = new Map(); // family_code -> Set of notified timestamps
  for (const [code, m] of markers) {
    seen.set(code, new Set((m && m.notified_timestamps) || []));
  }
  return groups.map((group) => {
    let set = seen.get(group.family_code);
    if (!set) {
      set = new Set();
      seen.set(group.family_code, set);
    }
    if (set.has(group.timestamp)) {
      return { group, action: "skip", isUpdate: false };
    }
    const isUpdate = set.size > 0;
    set.add(group.timestamp);
    return { group, action: "email", isUpdate };
  });
}

// Side label for a family's tag list: "bride-side", "groom-side",
// "bride-side + groom-side", or "" when the family has neither side tag.
function sideLabel(tags) {
  const sides = ["bride-side", "groom-side"].filter((s) =>
    (tags || []).includes(s)
  );
  return sides.join(" + ");
}

// Side label for a `families` doc: tags live on the members, so the
// family's side is the union of its members' tags (same as the site's
// session tags). A missing doc has no side.
function familySideFromDoc(familyDoc) {
  if (!familyDoc) return "";
  const tags = [...new Set((familyDoc.members || []).flatMap((m) => m.tags || []))];
  return sideLabel(tags);
}

// One digest section for one family's submission.
function buildFamilySection(group, isUpdate, side) {
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
  const heading =
    `${verb}: ${group.family_name} (${group.family_code})` +
    (side ? ` — ${side}` : "");
  return (
    `${heading}\n` +
    `Submitted: ${group.timestamp}\n\n` +
    lines.join("\n\n") +
    (dietary ? `\n\nDietary / wishes: ${dietary}` : "")
  );
}

// The whole digest: one section per family, admin link once at the end.
// sections: [{ group, isUpdate, side }] in the order they should appear.
function buildDigestText(sections) {
  const body = sections
    .map((s) => buildFamilySection(s.group, s.isUpdate, s.side))
    .join("\n\n---\n\n");
  return {
    subject: DIGEST_SUBJECT,
    text: body + `\n\nView in admin: ${ADMIN_URL}`,
  };
}

// Build the SendGrid v3 /mail/send request body for the digest.
function buildSendGridPayload(subject, text, from, recipients) {
  return {
    personalizations: [
      { to: recipients.map((email) => ({ email })) },
    ],
    from: { email: from, name: "Disha & Rajat Wedding" },
    subject,
    content: [{ type: "text/plain", value: text }],
  };
}

// Live run -----------------------------------------------------------------

async function sendViaSendGrid(payload, apiKey) {
  const res = await fetch(SENDGRID_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  // 202 Accepted with an empty body = queued for delivery.
  if (res.status !== 202) {
    const body = await res.text();
    throw new Error(`SendGrid ${res.status}: ${body.slice(0, 500)}`);
  }
}

async function main() {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "{}"
  );
  if (!serviceAccount.private_key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON secret is missing or not valid JSON"
    );
  }
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM) {
    throw new Error("SENDGRID_API_KEY / SENDGRID_FROM secrets are missing");
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
    `Found ${docs.length} recent rsvps docs in ${groups.length} submission(s).`
  );
  if (!groups.length) return;

  // Load each involved family's marker doc (one read per family).
  const markers = new Map();
  for (const code of new Set(groups.map((g) => g.family_code))) {
    const m = await db.collection(MARKER_COLLECTION).doc(code).get();
    if (m.exists) markers.set(code, m.data());
  }

  const plans = planNotifications(groups, markers);
  const toEmail = plans.filter((p) => p.action === "email");
  if (!toEmail.length) {
    console.log("All recent submissions were already emailed. Done.");
    return;
  }

  // Side tags come from the `families` doc (union of member tags).
  const sides = new Map();
  for (const code of new Set(toEmail.map((p) => p.group.family_code))) {
    const f = await db.collection("families").doc(code).get();
    sides.set(code, familySideFromDoc(f.exists ? f.data() : null));
  }

  const sections = toEmail.map((p) => ({
    group: p.group,
    isUpdate: p.isUpdate,
    side: sides.get(p.group.family_code) || "",
  }));
  const { subject, text } = buildDigestText(sections);
  const recipients = NOTIFY_EMAILS.split(",").map((s) => s.trim());
  await sendViaSendGrid(
    buildSendGridPayload(subject, text, process.env.SENDGRID_FROM, recipients),
    process.env.SENDGRID_API_KEY
  );
  console.log(
    `Emailed digest: ${subject} (${sections.length} famil${
      sections.length === 1 ? "y" : "ies"
    }, ${toEmail.reduce((n, p) => n + p.group.docs.length, 0)} docs)`
  );

  // Record every emailed timestamp in its family's marker so no group is
  // ever emailed twice. The markers live outside the rsvps docs precisely
  // because the site's re-save would wipe a flag on those docs.
  const batch = db.batch();
  for (const { group } of toEmail) {
    batch.set(
      db.collection(MARKER_COLLECTION).doc(group.family_code),
      {
        notified_timestamps: admin.firestore.FieldValue.arrayUnion(
          group.timestamp
        ),
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  }
  await batch.commit();
  console.log("Done.");
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  groupSubmissions,
  planNotifications,
  sideLabel,
  familySideFromDoc,
  buildFamilySection,
  buildDigestText,
  buildSendGridPayload,
};
