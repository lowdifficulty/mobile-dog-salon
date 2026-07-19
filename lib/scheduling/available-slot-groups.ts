import {
  BOOKING_BLOCK_STARTS,
  bookingBlockStartsForGroomer,
  bookingDurationMinutesForGroomer,
  formatDisplayTime,
} from "./groomers";
import { BOOKING_DURATION_MINUTES } from "./services";
import type { GroomerId } from "./types";
import type { AvailableVanTimeslot } from "./van-capacity";

export const HOURS_PER_VAN_BLOCK = BOOKING_DURATION_MINUTES / 60;

export type AvailableSlotGroup = {
  id: string;
  date: string;
  displayDate: string;
  displayTime: string;
  slots: AvailableVanTimeslot[];
  /** Two or more consecutive open blocks on the same day. */
  isShift: boolean;
  hours: number;
};

export function hoursForBlockCount(blockCount: number, groomerId?: GroomerId): number {
  const hoursPerBlock = groomerId
    ? bookingDurationMinutesForGroomer(groomerId) / 60
    : HOURS_PER_VAN_BLOCK;
  return blockCount * hoursPerBlock;
}

/** Navy shade class for 1–4 open shift blocks (1 = lightest, 4 = darkest). */
export function navyShadeClassesForBlockCount(blockCount: number): string {
  const clamped = Math.min(4, Math.max(0, Math.round(blockCount)));
  if (clamped === 0) return "";
  return `van-slot-shade-${clamped}`;
}

function blockIndex(time: string, blockStarts: readonly string[]): number {
  return blockStarts.indexOf(time);
}

export function formatGroupedSlotDisplay(
  slots: AvailableVanTimeslot[],
  groomerId?: GroomerId
): string {
  if (slots.length === 0) return "";
  if (slots.length === 1) return slots[0].displayTime;

  const first = slots[0].time;
  const last = slots[slots.length - 1].time;
  const durationMinutes = groomerId
    ? bookingDurationMinutesForGroomer(groomerId)
    : BOOKING_DURATION_MINUTES;
  const [lh, lm] = last.split(":").map(Number);
  const endMinutes = lh * 60 + (lm ?? 0) + durationMinutes;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endTime24 = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  return `${formatDisplayTime(first)} – ${formatDisplayTime(endTime24)}`;
}

/** Group open van slots into same-day consecutive runs (shifts vs singles). */
export function groupAvailableVanTimeslots(
  slots: AvailableVanTimeslot[],
  groomerId?: GroomerId
): AvailableSlotGroup[] {
  const blockStarts = groomerId
    ? bookingBlockStartsForGroomer(groomerId)
    : BOOKING_BLOCK_STARTS;
  const byDate = new Map<string, AvailableVanTimeslot[]>();

  for (const slot of slots) {
    const list = byDate.get(slot.date) ?? [];
    list.push(slot);
    byDate.set(slot.date, list);
  }

  const groups: AvailableSlotGroup[] = [];

  for (const date of [...byDate.keys()].sort()) {
    const daySlots = byDate.get(date)!;
    const byTime = new Map(daySlots.map((slot) => [slot.time, slot]));
    const ordered = (blockStarts as readonly string[])
      .filter((time) => byTime.has(time))
      .map((time) => byTime.get(time)!);

    let run: AvailableVanTimeslot[] = [];

    const flush = () => {
      if (!run.length) return;
      groups.push({
        id: run.map((slot) => `${slot.date}|${slot.time}`).join("|"),
        date: run[0].date,
        displayDate: run[0].displayDate,
        displayTime: formatGroupedSlotDisplay(run, groomerId),
        slots: run,
        isShift: run.length >= 2,
        hours: hoursForBlockCount(run.length, groomerId),
      });
      run = [];
    };

    for (const slot of ordered) {
      if (!run.length) {
        run = [slot];
        continue;
      }
      const prevIdx = blockIndex(run[run.length - 1].time, blockStarts);
      const currIdx = blockIndex(slot.time, blockStarts);
      if (currIdx === prevIdx + 1) {
        run.push(slot);
      } else {
        flush();
        run = [slot];
      }
    }
    flush();
  }

  return groups;
}
