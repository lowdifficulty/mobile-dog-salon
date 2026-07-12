import {
  BOOKING_BLOCK_STARTS,
  SHIFT_HORIZON_MONTHS,
  formatBookingBlockDisplay,
  formatDisplayTime,
  groomerName,
} from "./groomers";
import {
  hasMinimumAvailabilityForBooking,
  isBookingBlockEnabled,
  releaseGroomerShiftWithoutAppointment,
  setBookingBlockEnabled,
} from "./availability";
import { effectiveAvailability } from "./effective-availability";
import { appointmentBlockMinutes, BOOKING_DURATION_MINUTES } from "./services";
import {
  VAN_COUNT,
  addMonthsToDate,
  getShiftHorizonEndDate,
  getTodayPacificDate,
  isVanSlotTaken,
  parseSlotFromIso,
} from "./slots";
import type {
  Appointment,
  AvailabilityDay,
  GroomerId,
  SchedulingData,
} from "./types";

export { VAN_COUNT, isVanSlotTaken };

export interface VanConflictAppointment {
  id: string;
  groomerId: GroomerId;
  groomerName: string;
  date: string;
  time: string;
  displayTime: string;
  petName: string;
  clientName: string;
  startAt: string;
}

export interface VanConflict {
  id: string;
  date: string;
  displayWindow: string;
  appointments: VanConflictAppointment[];
}

export interface AvailableVanTimeslot {
  date: string;
  time: string;
  displayTime: string;
  displayDate: string;
}

/** Melanie and Diamond both open for the same shift (1 van can't serve both). */
export interface GroomerAvailabilityOverlap {
  id: string;
  date: string;
  time: string;
  displayTime: string;
  displayDate: string;
}

function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

function appointmentWindow(ap: Appointment): {
  date: string;
  time: string;
  start: Date;
  end: Date;
} {
  const { date, time } = parseSlotFromIso(ap.startAt);
  const start = new Date(ap.startAt);
  const end = new Date(
    start.getTime() + appointmentBlockMinutes(ap.durationMinutes) * 60 * 1000
  );
  return { date, time, start, end };
}

function toConflictAppointment(ap: Appointment): VanConflictAppointment {
  const { date, time } = parseSlotFromIso(ap.startAt);
  return {
    id: ap.id,
    groomerId: ap.groomerId,
    groomerName: groomerName(ap.groomerId),
    date,
    time,
    displayTime: formatBookingBlockDisplay(time),
    petName: ap.petName,
    clientName: `${ap.firstName} ${ap.lastName}`.trim(),
    startAt: ap.startAt,
  };
}

/** Groups of overlapping confirmed appointments that exceed 1-van capacity. */
export function findVanConflicts(appointments: Appointment[]): VanConflict[] {
  const active = appointments
    .filter((ap) => ap.status === "confirmed")
    .map((ap) => ({ ap, ...appointmentWindow(ap) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id) ?? id;
    if (p !== id) {
      const root = find(p);
      parent.set(id, root);
      return root;
    }
    return id;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const item of active) parent.set(item.ap.id, item.ap.id);

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      if (overlaps(active[i].start, active[i].end, active[j].start, active[j].end)) {
        union(active[i].ap.id, active[j].ap.id);
      }
    }
  }

  const groups = new Map<string, typeof active>();
  for (const item of active) {
    const root = find(item.ap.id);
    const list = groups.get(root) ?? [];
    list.push(item);
    groups.set(root, list);
  }

  const conflicts: VanConflict[] = [];
  for (const group of groups.values()) {
    if (group.length <= VAN_COUNT) continue;
    const first = group[0];
    const times = [...new Set(group.map((g) => g.time))].sort();
    conflicts.push({
      id: group.map((g) => g.ap.id).sort().join("|"),
      date: first.date,
      displayWindow: times.map((t) => formatDisplayTime(t)).join(" / "),
      appointments: group.map((g) => toConflictAppointment(g.ap)),
    });
  }

  return conflicts.sort((a, b) => a.date.localeCompare(b.date));
}

/** Shifts where Melanie and Diamond are both effectively available at once. */
export function findGroomerAvailabilityOverlaps(
  data: SchedulingData,
  options?: { from?: string; to?: string }
): GroomerAvailabilityOverlap[] {
  const from = options?.from ?? getTodayPacificDate();
  const to = options?.to ?? addMonthsToDate(from, 1);
  const effective = effectiveAvailability(data);

  const timesByGroomer: Record<GroomerId, Map<string, string[]>> = {
    melanie: new Map(),
    diamond: new Map(),
  };

  for (const day of effective) {
    if (day.groomerId !== "melanie" && day.groomerId !== "diamond") continue;
    timesByGroomer[day.groomerId].set(day.date, day.times);
  }

  const overlaps: GroomerAvailabilityOverlap[] = [];

  for (const date of eachDateInclusive(from, to)) {
    const melanieTimes = timesByGroomer.melanie.get(date) ?? [];
    const diamondTimes = timesByGroomer.diamond.get(date) ?? [];
    if (!melanieTimes.length || !diamondTimes.length) continue;

    for (const time of BOOKING_BLOCK_STARTS) {
      if (!hasMinimumAvailabilityForBooking(melanieTimes, time)) continue;
      if (!hasMinimumAvailabilityForBooking(diamondTimes, time)) continue;
      if (
        isVanSlotTaken(date, time, BOOKING_DURATION_MINUTES, data.appointments)
      ) {
        continue;
      }
      overlaps.push({
        id: `${date}|${time}`,
        date,
        time,
        displayTime: formatBookingBlockDisplay(time),
        displayDate: formatShortDate(date),
      });
    }
  }

  return overlaps.sort((a, b) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
  );
}

function formatShortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function eachDateInclusive(from: string, to: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function isVanShiftClaimedByGroomers(
  date: string,
  time: string,
  availability: AvailabilityDay[]
): boolean {
  for (const day of availability) {
    if (day.date !== date) continue;
    if (isBookingBlockEnabled(day.times, time)) return true;
  }
  return false;
}

/**
 * Open van timeslots: shift starts with no overlapping appointment and no groomer shift claim.
 * With 1 van, each start can hold at most one visit fleet-wide.
 */
export function listAvailableVanTimeslots(
  appointments: Appointment[],
  availability: AvailabilityDay[] = [],
  options?: { from?: string; to?: string }
): AvailableVanTimeslot[] {
  const from = options?.from ?? getTodayPacificDate();
  const to = options?.to ?? getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS);
  const open: AvailableVanTimeslot[] = [];

  for (const date of eachDateInclusive(from, to)) {
    for (const time of BOOKING_BLOCK_STARTS) {
      if (isVanSlotTaken(date, time, BOOKING_DURATION_MINUTES, appointments)) {
        continue;
      }
      if (isVanShiftClaimedByGroomers(date, time, availability)) {
        continue;
      }
      open.push({
        date,
        time,
        displayTime: formatBookingBlockDisplay(time),
        displayDate: formatShortDate(date),
      });
    }
  }

  return open;
}

/**
 * Ensure each confirmed appointment has a matching shift on that groomer's calendar.
 * Does not remove other open shifts — only allocates required coverage from bookings.
 */
export function allocateShiftsFromAppointments(
  data: SchedulingData
): AvailabilityDay[] {
  const byKey = new Map<string, AvailabilityDay>();

  for (const day of data.availability) {
    byKey.set(`${day.groomerId}|${day.date}`, {
      groomerId: day.groomerId,
      date: day.date,
      times: [...day.times],
    });
  }

  const today = getTodayPacificDate();
  const maxDate = getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS);

  for (const ap of data.appointments) {
    if (ap.status === "cancelled") continue;
    const { date, time } = parseSlotFromIso(ap.startAt);
    if (date < today || date > maxDate) continue;
    if (!(BOOKING_BLOCK_STARTS as readonly string[]).includes(time)) continue;

    const key = `${ap.groomerId}|${date}`;
    const existing = byKey.get(key) ?? {
      groomerId: ap.groomerId,
      date,
      times: [] as string[],
    };
    if (!isBookingBlockEnabled(existing.times, time)) {
      existing.times = setBookingBlockEnabled(existing.times, time, true);
    }
    byKey.set(key, existing);
  }

  return [...byKey.values()]
    .filter((day) => day.times.length > 0)
    .sort((a, b) =>
      a.date === b.date
        ? a.groomerId.localeCompare(b.groomerId)
        : a.date.localeCompare(b.date)
    );
}

/**
 * Re-sync groomer shifts and van-capacity views with current appointments.
 * Clears shift blocks for cancelled bookings and re-allocates coverage for confirmed ones.
 */
export function reconcileSchedulingData(data: SchedulingData): SchedulingData {
  for (const ap of data.appointments) {
    if (ap.status !== "cancelled") continue;
    const { date, time } = parseSlotFromIso(ap.startAt);
    if (!(BOOKING_BLOCK_STARTS as readonly string[]).includes(time)) continue;
    releaseGroomerShiftWithoutAppointment(data, ap.groomerId, date, time, {
      ignoreAppointmentId: ap.id,
    });
  }

  data.availability = allocateShiftsFromAppointments(data);
  return data;
}

export function vanCapacitySummary(data: SchedulingData) {
  const today = getTodayPacificDate();
  const nearTermEnd = addMonthsToDate(today, 1);
  const range = { from: today, to: nearTermEnd };
  const availableNearTerm = listAvailableVanTimeslots(
    data.appointments,
    data.availability,
    range
  );
  const conflicts = findVanConflicts(
    data.appointments.filter((ap) => {
      if (ap.status !== "confirmed") return false;
      const { date } = parseSlotFromIso(ap.startAt);
      return date >= today;
    })
  );
  const groomerAvailabilityOverlaps = findGroomerAvailabilityOverlaps(data, range);

  return {
    vanCount: VAN_COUNT,
    availableTimeslots: availableNearTerm,
    availableCount: availableNearTerm.length,
    conflicts,
    conflictCount: conflicts.length,
    groomerAvailabilityOverlaps,
    groomerAvailabilityOverlapCount: groomerAvailabilityOverlaps.length,
  };
}
