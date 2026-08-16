import {
  bookingBlockForClock,
  looksLikeRescheduleRequest,
  nextBookingBlock,
  parseClockMinutes,
  resolveRescheduleTarget,
} from "../lib/client/licky-reschedule-match";
import type { AvailableSlot } from "../lib/scheduling/types";

function slot(
  groomerId: AvailableSlot["groomerId"],
  date: string,
  time: string
): AvailableSlot {
  return {
    groomerId,
    groomerName: groomerId,
    date,
    time,
    displayTime: time,
    slotKey: `${groomerId}|${date}|${time}`,
  };
}

function assert(cond: unknown, message: string) {
  if (!cond) throw new Error(message);
}

assert(parseClockMinutes("10:30am") === 10 * 60 + 30, "10:30am");
assert(parseClockMinutes("10:30") === 10 * 60 + 30, "10:30");
assert(parseClockMinutes("2pm") === 14 * 60, "2pm");
assert(bookingBlockForClock("melanie", 10 * 60 + 30) === "08:00", "Melanie 10:30 → 8am window");
assert(bookingBlockForClock("jessica", 10 * 60 + 30) === "10:00", "Jessica 10:30 → 10am window");
assert(nextBookingBlock("melanie", "08:00") === "11:00", "next after 8am is 11am");

assert(looksLikeRescheduleRequest("can I change to 10:30"), "change to 10:30");
assert(looksLikeRescheduleRequest("change my appointment to 10:30am"), "change my appointment");
assert(!looksLikeRescheduleRequest("what time is my appointment"), "status is not reschedule");
assert(!looksLikeRescheduleRequest("change my address"), "address is not reschedule");

const open = [
  slot("melanie", "2026-08-20", "11:00"),
  slot("melanie", "2026-08-20", "14:00"),
  slot("melanie", "2026-08-21", "08:00"),
];

const melanie1030 = resolveRescheduleTarget({
  currentDate: "2026-08-20",
  currentTime: "08:00",
  currentGroomerId: "melanie",
  preference: "change to 10:30am",
  openSlots: open,
});
assert(melanie1030.status === "target", "Melanie 10:30 should pick a later window");
if (melanie1030.status === "target") {
  assert(melanie1030.slot.time === "11:00", "maps 10:30 to 11:00");
  assert(melanie1030.mappedFromSameWindow === true, "same 8–11 window");
}

const jessicaOpen = [
  slot("jessica", "2026-08-20", "10:00"),
  slot("jessica", "2026-08-20", "12:00"),
];
const jessica1030 = resolveRescheduleTarget({
  currentDate: "2026-08-20",
  currentTime: "08:00",
  currentGroomerId: "jessica",
  preference: "10:30am",
  openSlots: jessicaOpen,
});
assert(jessica1030.status === "target", "Jessica 10:30 should hit 10:00");
if (jessica1030.status === "target") {
  assert(jessica1030.slot.time === "10:00", "Jessica 10:30 → 10:00");
  assert(jessica1030.mappedFromSameWindow === false, "different Jessica block");
}

const taken = resolveRescheduleTarget({
  currentDate: "2026-08-20",
  currentTime: "08:00",
  currentGroomerId: "melanie",
  preference: "10:30am",
  openSlots: [slot("melanie", "2026-08-21", "08:00")],
});
assert(taken.status === "unavailable", "no later same-day slot → unavailable");

console.log("licky-reschedule-match: all checks passed");
