/**
 * Compare Melanie groomer shifts vs public bookable slots (local data/scheduling.json).
 * Usage: npm run pull:prod && npx tsx scripts/audit-melanie-availability.mjs
 */

import { readFileSync } from "fs";
import { getCustomerAvailableSlotsForDate } from "../lib/scheduling/customer-availability.ts";
import { listSelfBookingStarts, listBookingBlockStarts } from "../lib/scheduling/availability.ts";
import { isGroomerFullyBooked } from "../lib/scheduling/capacity.ts";
import { effectiveAvailabilityTimes } from "../lib/scheduling/effective-availability.ts";
import { isSlotTaken, isVanSlotTaken } from "../lib/scheduling/slots.ts";
import { bookingDurationMinutesForGroomer } from "../lib/scheduling/groomers.ts";
import { availabilityVan } from "../lib/scheduling/vans.ts";

const data = JSON.parse(readFileSync("data/scheduling.json", "utf8"));
const from = "2026-08-06";
const to = "2026-10-05";

const melDays = data.availability
  .filter((a) => a.groomerId === "melanie" && a.date >= from && a.date <= to)
  .sort((a, b) => a.date.localeCompare(b.date));

let withPub = 0;
let without = 0;

for (const day of melDays) {
  const pub = getCustomerAvailableSlotsForDate(day.date, data, "full-groom").filter(
    (s) => s.groomerId === "melanie"
  );
  if (pub.length) {
    withPub++;
    console.log("PUBLIC", day.date, pub.map((s) => s.time).join(","));
    continue;
  }
  without++;
  const eff = effectiveAvailabilityTimes(
    "melanie",
    day.date,
    day.times,
    data.appointments
  );
  const fb = isGroomerFullyBooked("melanie", day.date, data.appointments);
  const dur = bookingDurationMinutesForGroomer("melanie");
  const taken = (t) =>
    isSlotTaken("melanie", day.date, t, dur, data.appointments) ||
    isVanSlotTaken(
      day.date,
      t,
      dur,
      data.appointments,
      undefined,
      availabilityVan(day),
      data.availability,
      "melanie"
    );
  const rawStarts = listSelfBookingStarts(day.times, "melanie", taken);
  const effStarts = listSelfBookingStarts(eff, "melanie", taken);
  const blocks = listBookingBlockStarts(day.times, "melanie");
  console.log("MISSING", day.date, {
    fullyBooked: fb,
    blocks: blocks.length,
    rawStarts: rawStarts.length,
    effStarts: effStarts.length,
    effHours: `${eff.length}/${day.times.length}`,
  });
}

console.log("\nSummary:", { shiftDays: melDays.length, withPub, without });
