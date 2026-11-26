// Mock-data tests for notify-rsvps.js grouping + email text.
// No Firestore or SMTP needed: exercises the pure functions only.
const assert = require("assert");
const { groupSubmissions, buildEmailText } = require("./notify-rsvps");

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
  // Already notified: must be excluded.
  { family_code: "FAM03", family_name: "Old Family", guest_name: "Old Guest", event_id: "shaadi", event_title: "Shaadi", status: "attending", timestamp: T1, notified: true },
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

const email1 = buildEmailText(famA1, false);
assert.strictEqual(email1.subject, "New RSVP — Khanna Family");
assert.ok(email1.text.includes("Rajat Khanna (555-1)"), "phone shown");
assert.ok(email1.text.includes("Sangeet: attending"), "event status listed");
assert.ok(email1.text.includes("Shaadi: attending"), "second event listed");
assert.ok(email1.text.includes("Disha Jain"), "second guest listed");
assert.ok(email1.text.includes("Dietary / wishes: Veg"), "dietary shown");
assert.ok(email1.text.includes("admin.html"), "admin link present");

const email2 = buildEmailText(famA2, true);
assert.strictEqual(email2.subject, "RSVP updated — Khanna Family");
assert.ok(email2.text.includes("Sangeet: declining"), "edit shows new status");

const email3 = buildEmailText(famB, false);
assert.ok(email3.text.includes("No nuts"), "family B dietary shown");

console.log("All mock tests pass: 3 groups, new vs updated subjects, email contents correct.");
