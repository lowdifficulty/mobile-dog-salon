/**
 * Unit check: partial groomer save must not wipe other days.
 * Usage: npx tsx scripts/verify-availability-merge.mjs
 */

import { applyGroomerAvailabilitySave } from "../lib/scheduling/availability-save.ts";

const data = {
  availability: [
    {
      groomerId: "melanie",
      date: "2026-08-11",
      times: ["11:00", "12:00", "13:00"],
    },
    {
      groomerId: "melanie",
      date: "2026-08-14",
      times: ["08:00", "09:00", "10:00"],
    },
  ],
  appointments: [],
};

const { error } = applyGroomerAvailabilitySave(
  data,
  "melanie",
  [
    {
      groomerId: "melanie",
      date: "2026-08-10",
      times: ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00"],
    },
  ],
  "nissan"
);

if (error) {
  console.error("FAIL apply save:", error);
  process.exit(1);
}

const melanieDates = data.availability
  .filter((d) => d.groomerId === "melanie")
  .map((d) => d.date)
  .sort();

if (
  !melanieDates.includes("2026-08-10") ||
  !melanieDates.includes("2026-08-11") ||
  !melanieDates.includes("2026-08-14")
) {
  console.error("FAIL expected all three dates, got:", melanieDates);
  process.exit(1);
}

console.log("OK   partial save upserts without wiping other days");
