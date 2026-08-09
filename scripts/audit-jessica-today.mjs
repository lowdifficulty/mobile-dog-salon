/**
 * Audit Jessica appointments for a Pacific calendar day.
 * Usage: npx tsx scripts/audit-jessica-today.mjs [YYYY-MM-DD]
 */

import { readFileSync } from "fs";
import { parseSlotFromIso, getTodayPacificDate } from "../lib/scheduling/slots.ts";
import {
  filterStaffAppointments,
  isStaffUpcomingAppointment,
} from "../lib/scheduling/appointment-filters.ts";
import { appointmentPacificDate } from "../lib/scheduling/daily-route.ts";

const date = process.argv[2] ?? getTodayPacificDate();
const data = JSON.parse(readFileSync("data/scheduling.json", "utf8"));
const now = new Date();

const allJessica = data.appointments.filter((a) => a.groomerId === "jessica");
const onDay = allJessica.filter((a) => {
  const d = parseSlotFromIso(a.startAt).date;
  const d2 = appointmentPacificDate(a.startAt);
  return d === date || d2 === date;
});

console.log("Pacific today:", getTodayPacificDate());
console.log("Audit date:", date);
console.log("Jessica on day (parseSlotFromIso):", allJessica.filter((a) => parseSlotFromIso(a.startAt).date === date).length);
console.log("Jessica on day (appointmentPacificDate):", allJessica.filter((a) => appointmentPacificDate(a.startAt) === date).length);

for (const ap of onDay.sort((a, b) => a.startAt.localeCompare(b.startAt))) {
  const slot = parseSlotFromIso(ap.startAt);
  console.log({
    id: ap.id?.slice(0, 8),
    status: ap.status,
    startAt: ap.startAt,
    pacificDate: slot.date,
    pacificTime: slot.time,
    upcoming: isStaffUpcomingAppointment(ap, now),
    client: `${ap.firstName} ${ap.lastName}`,
  });
}

const groomerApiAll = filterStaffAppointments(
  allJessica.filter((a) => a.status === "confirmed" || true),
  "all",
  now
).filter((a) => parseSlotFromIso(a.startAt).date === date && a.status === "confirmed");

const groomerApiUpcoming = filterStaffAppointments(allJessica, "upcoming", now).filter(
  (a) => parseSlotFromIso(a.startAt).date === date
);

console.log("\nCalendar (confirmed, byDate):", allJessica.filter((a) => a.status === "confirmed" && parseSlotFromIso(a.startAt).date === date).length);
console.log("List filter=all confirmed today:", groomerApiAll.length);
console.log("List filter=upcoming today:", groomerApiUpcoming.length);
