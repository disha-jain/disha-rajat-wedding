// Mock-data tests for notify-rsvps.js grouping, notification planning
// (marker docs), side tags, digest text and the SendGrid payload. No
// Firestore or SendGrid needed: exercises the pure functions only.
const assert = require("assert");
const {
  groupSubmissions,
  planNotifications,
  sideLabel,
  familySideFromDoc,
  buildFamilySection,
  buildDigestText,
  buildSendGridPayload,
} = require("./notify-rsvps");

const T0 = "2026-11-25T05:00:00.000Z";
const T1 = "2026-11-26T05:00:00.000Z";
const T2 = "2026-11-26T05:10:00.000Z";

const docs = [
  // Family A, one submit: 2 guests x 2 events, same timestamp -> 1 group.
  { family_code: "FAM01", family_name: "Khanna Family", guest_name: "Rajat Khanna", phone: "555-1", event_id: "sangeet", event_title: "Sangeet", status: "attending", dietary_notes: "Veg", timestamp: T1 },
  { family_code: "FAM01", family_name: "Khanna Family", guest_name: "Rajat Khanna", phone: "555-1", event_id: "shaadi", event_title: "Shaadi", status: "attending", dietary_notes: "Veg", timestamp: T1 },
  { family_code: "FAM01", family_name: "Khanna Family", guest_name: "Disha Jain", phone: "", event_id: "sangeet", event_title: "Sangeet", status: "attending", dietary_notes: "", timestamp: T1 },
  // Family A edits later (new timestamp) -> separate group.
  { family_code: "FAM01", family_name: "Khanna Family", guest_name: "Rajat Khanna", phone: "555-1", event_id: "sangeet", event_title: "Sangeet", status: "declining", dietary_notes: "Veg", timestamp: T2 },
  // Family B, one submit.
  { family_code: "FAM02", family_name: "Sharma Family", guest_name: "Asha Sharma", phone: "", event_id: "shaadi", event_title: "Shaadi", status: "attending", dietary_notes: "No nuts", timestamp: T1 },
  // Missing timestamp: skipped.
  { family_code: "FAM04", family_name: "Broken Family", guest_name: "No Time", event_id: "shaadi", event_title: "Shaadi", status: "attending" },
];

const groups = groupSubmissions(docs);
assert.strictEqual(groups.length, 3, `expected 3 groups, got ${groups.length}`);
const famA1 = groups.find((g) => g.family_code === "FAM01" && g.timestamp === T1);
const famA2 = groups.find((g) => g.family_code === "FAM01" && g.timestamp === T2);
const famB = groups.find((g) => g.family_code === "FAM02");
assert.ok(famA1 && famA1.docs.length === 3, "FAM01 first submit = 3 docs");
assert.ok(famA2 && famA2.docs.length === 1, "FAM01 edit = 1 doc");
assert.ok(famB && famB.docs.length === 1, "FAM02 submit = 1 doc");

// Planning with no markers: first group is new, a second group for the
// same family in the same run is an update, another family is new.
const fresh = planNotifications(groups, new Map());
assert.deepStrictEqual(
  fresh.map((p) => [p.group.family_code, p.group.timestamp, p.action, p.isUpdate]),
  [
    ["FAM01", T1, "email", false],
    ["FAM01", T2, "email", true],
    ["FAM02", T1, "email", false],
  ],
  "fresh run: new, then update for same family, then new"
);

// Planning with a marker: an already-emailed timestamp is skipped, a new
// timestamp for the same family is an update, and a family whose marker
// holds an older timestamp is also an update.
const withMarkers = planNotifications(groups, new Map([
  ["FAM01", { notified_timestamps: [T1] }],
  ["FAM02", { notified_timestamps: [T0] }],
]));
assert.deepStrictEqual(
  withMarkers.map((p) => [p.group.family_code, p.group.timestamp, p.action, p.isUpdate]),
  [
    ["FAM01", T1, "skip", false],
    ["FAM01", T2, "email", true],
    ["FAM02", T1, "email", true],
  ],
  "marked run: skip emailed group, update on new timestamp"
);

// The edit-after-notify case that broke the old flag design: the family's
// docs were re-saved (flag wiped), but the marker still knows T1 was
// emailed, so the T2 group is correctly an update, not a new RSVP.
const editCase = planNotifications(
  [famA2],
  new Map([["FAM01", { notified_timestamps: [T1] }]])
);
assert.strictEqual(editCase.length, 1);
assert.strictEqual(editCase[0].action, "email");
assert.strictEqual(editCase[0].isUpdate, true, "edit after notify = RSVP updated");

// Side labels from tag lists.
assert.strictEqual(sideLabel(["bride-side"]), "bride-side");
assert.strictEqual(sideLabel(["groom-side"]), "groom-side");
assert.strictEqual(
  sideLabel(["india-guest", "groom-side", "us-guest", "bride-side"]),
  "bride-side + groom-side",
  "both sides, bride first, other tags ignored"
);
assert.strictEqual(sideLabel(["india-guest", "us-guest"]), "");
assert.strictEqual(sideLabel([]), "");
assert.strictEqual(sideLabel(null), "");

// Side from a families doc: union of member tags (same as the site's
// session tags). Missing doc / no members -> no side.
assert.strictEqual(
  familySideFromDoc({ members: [
    { tags: ["india-guest", "bride-side"] },
    { tags: ["us-guest"] },
  ] }),
  "bride-side"
);
assert.strictEqual(
  familySideFromDoc({ members: [
    { tags: ["bride-side"] },
    { tags: ["groom-side"] },
  ] }),
  "bride-side + groom-side",
  "members on different sides -> both"
);
assert.strictEqual(familySideFromDoc(null), "");
assert.strictEqual(familySideFromDoc({ members: [] }), "");

// One family's digest section.
const section1 = buildFamilySection(famA1, false, "bride-side");
assert.ok(section1.startsWith("New RSVP: Khanna Family (FAM01) — bride-side"), "heading has side");
assert.ok(section1.includes("Submitted: " + T1), "submitted line kept");
assert.ok(section1.includes("Rajat Khanna (555-1)"), "phone shown");
assert.ok(section1.includes("Sangeet: attending"), "event status listed");
assert.ok(section1.includes("Shaadi: attending"), "second event listed");
assert.ok(section1.includes("Disha Jain"), "second guest listed");
assert.ok(section1.includes("Dietary / wishes: Veg"), "dietary shown");
assert.ok(!section1.includes("admin.html"), "admin link is digest-level, not per section");

const section2 = buildFamilySection(famA2, true, "bride-side + groom-side");
assert.ok(section2.startsWith("RSVP updated: Khanna Family (FAM01) — bride-side + groom-side"));
assert.ok(section2.includes("Sangeet: declining"), "edit shows new status");

const sectionNoSide = buildFamilySection(famB, false, "");
assert.ok(sectionNoSide.startsWith("New RSVP: Sharma Family (FAM02)\n"), "no side -> no dash");

// The digest: fixed subject, sections joined, admin link once at the end.
const digest = buildDigestText([
  { group: famA1, isUpdate: false, side: "bride-side" },
  { group: famB, isUpdate: false, side: "groom-side" },
]);
assert.strictEqual(digest.subject, "Wedding Guest RSVP Updates");
assert.ok(digest.text.includes("New RSVP: Khanna Family (FAM01) — bride-side"));
assert.ok(digest.text.includes("New RSVP: Sharma Family (FAM02) — groom-side"));
assert.ok(digest.text.includes("\n\n---\n\n"), "sections separated");
assert.strictEqual(
  (digest.text.match(/admin\.html/g) || []).length,
  1,
  "admin link appears exactly once"
);

// SendGrid payload for the digest.
const payload = buildSendGridPayload(
  digest.subject,
  digest.text,
  "dishajain2016@gmail.com",
  ["khanna.rjt@gmail.com", "dishajain2016@gmail.com"]
);
assert.deepStrictEqual(payload.personalizations, [
  { to: [{ email: "khanna.rjt@gmail.com" }, { email: "dishajain2016@gmail.com" }] },
]);
assert.deepStrictEqual(payload.from, {
  email: "dishajain2016@gmail.com",
  name: "Disha & Rajat Wedding",
});
assert.strictEqual(payload.subject, "Wedding Guest RSVP Updates");
assert.strictEqual(payload.content.length, 1);
assert.strictEqual(payload.content[0].type, "text/plain");
assert.ok(payload.content[0].value.includes("Rajat Khanna (555-1)"));

console.log("All mock tests pass: grouping, marker planning (new / updated / skip), side tags, digest sections, SendGrid payload correct.");
