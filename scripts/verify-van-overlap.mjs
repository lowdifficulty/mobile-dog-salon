/**
 * Van overlap rules — Diamond 11am (3hr) on Dodge blocks Jessica 10am/12pm, not 4pm.
 * Usage: node scripts/verify-van-overlap.mjs
 */

const JESSICA_STARTS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
const DIAMOND_STARTS = ["08:00", "11:00", "14:00", "17:00"];

function durationForGroomer(groomerId) {
  return groomerId === "jessica" ? 120 : 180;
}

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function window(startTime, durationMinutes) {
  const start = toMinutes(startTime);
  return { start, end: start + durationMinutes };
}

function overlaps(a, b) {
  return a.start < b.end && a.end > b.start;
}

function isBlocked(candidateStart, candidateGroomer, occupantStart, occupantGroomer) {
  const a = window(candidateStart, durationForGroomer(candidateGroomer));
  const b = window(occupantStart, durationForGroomer(occupantGroomer));
  return overlaps(a, b);
}

function assert(condition, label) {
  if (!condition) {
    console.error(`FAIL ${label}`);
    process.exit(1);
  }
  console.log(`OK   ${label}`);
}

const occupant = { groomer: "diamond", start: "11:00" };

for (const start of ["10:00", "12:00"]) {
  assert(
    isBlocked(start, "jessica", occupant.start, occupant.groomer),
    `Jessica ${start} blocked by Diamond 11:00`
  );
}

for (const start of ["14:00", "16:00", "08:00", "18:00"]) {
  assert(
    !isBlocked(start, "jessica", occupant.start, occupant.groomer),
    `Jessica ${start} open with Diamond 11:00`
  );
}

for (const start of JESSICA_STARTS) {
  for (const other of DIAMOND_STARTS) {
    const blocked = isBlocked(start, "jessica", other, "diamond");
  }
}

console.log("\nVan overlap self-test passed.");
