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
import { appointmentBlockMinutes, BOOKING_DURATION_MINUTES } from "./services";
import {
  appointmentVan,
  groomerForVan,
  vanForGroomer,
  VAN_COUNT,
  VAN_IDS,
  type VanId,
} from "./vans";
import {
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
  van: VanId;
  date: string;
  time: string;
  displayTime: string;
  displayDate: string;
}

export type VanSlotOccupancyStatus = "open" | "groomer" | "booked";

/** Fleet-wide status for one 3-hour van block (shift calendar monthly view). */
export interface VanSlotOccupancy {
  van: VanId;
  date: string;
  time: string;
  displayTime: string;
  status: VanSlotOccupancyStatus;
  groomerId?: GroomerId;
  groomerName?: string;
  petName?: string;
}

/** Legacy overlap type — no longer reported with dedicated vans per groomer. */
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

/** Groups of overlapping confirmed appointments that exceed capacity on one van. */
export function findVanConflicts(appointments: Appointment[]): VanConflict[] {
  const active = appointments
    .filter((ap) => ap.status === "confirmed")
    .map((ap) => ({ ap, van: appointmentVan(ap), ...appointmentWindow(ap) }))
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
      if (active[i].van !== active[j].van) continue;
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
    if (group.length <= 1) continue;
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

/** With dedicated vans, groomers can share the same shift start on different vans. */
export function findGroomerAvailabilityOverlaps(
  _data: SchedulingData,
  _options?: { from?: string; to?: string }
): GroomerAvailabilityOverlap[] {
  return [];
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

function isVanShiftClaimed(
  date: string,
  time: string,
  availability: AvailabilityDay[],
  vanId: VanId
): boolean {
  const groomerId = groomerForVan(vanId);
  for (const day of availability) {
    if (day.date !== date || day.groomerId !== groomerId) continue;
    if (isBookingBlockEnabled(day.times, time)) return true;
  }
  return false;
}

function findConfirmedAppointmentAtBlockStart(
  date: string,
  time: string,
  appointments: Appointment[],
  vanId: VanId
): Appointment | null {
  for (const ap of appointments) {
    if (ap.status !== "confirmed") continue;
    if (appointmentVan(ap) !== vanId) continue;
    const slot = parseSlotFromIso(ap.startAt);
    if (slot.date === date && slot.time === time) return ap;
  }
  return null;
}

/** Per-block occupancy for one van (shift calendar monthly view). */
export function buildVanSlotOccupancy(
  data: SchedulingData,
  options?: { from?: string; to?: string; van?: VanId }
): VanSlotOccupancy[] {
  const from = options?.from ?? getTodayPacificDate();
  const to = options?.to ?? getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS);
  const vans = options?.van ? [options.van] : VAN_IDS;
  const result: VanSlotOccupancy[] = [];

  for (const vanId of vans) {
    for (const date of eachDateInclusive(from, to)) {
      for (const time of BOOKING_BLOCK_STARTS) {
        const booking = findConfirmedAppointmentAtBlockStart(
          date,
          time,
          data.appointments,
          vanId
        );
        if (booking) {
          result.push({
            van: vanId,
            date,
            time,
            displayTime: formatBookingBlockDisplay(time),
            status: "booked",
            groomerId: booking.groomerId,
            groomerName: groomerName(booking.groomerId),
            petName: booking.petName,
          });
          continue;
        }

        const groomerId = groomerForVan(vanId);
        const day = data.availability.find(
          (a) => a.groomerId === groomerId && a.date === date
        );
        if (day && isBookingBlockEnabled(day.times, time)) {
          result.push({
            van: vanId,
            date,
            time,
            displayTime: formatBookingBlockDisplay(time),
            status: "groomer",
            groomerId,
            groomerName: groomerName(groomerId),
          });
          continue;
        }

        result.push({
          van: vanId,
          date,
          time,
          displayTime: formatBookingBlockDisplay(time),
          status: "open",
        });
      }
    }
  }

  return result;
}

/**
 * Open van timeslots for one van: no overlapping appointment and no shift claim on that van.
 */
export function listAvailableVanTimeslots(
  appointments: Appointment[],
  availability: AvailabilityDay[] = [],
  options?: { from?: string; to?: string; van?: VanId }
): AvailableVanTimeslot[] {
  const from = options?.from ?? getTodayPacificDate();
  const to = options?.to ?? getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS);
  const vans = options?.van ? [options.van] : VAN_IDS;
  const open: AvailableVanTimeslot[] = [];

  for (const vanId of vans) {
    for (const date of eachDateInclusive(from, to)) {
      for (const time of BOOKING_BLOCK_STARTS) {
        if (
          isVanSlotTaken(date, time, BOOKING_DURATION_MINUTES, appointments, undefined, vanId)
        ) {
          continue;
        }
        if (isVanShiftClaimed(date, time, availability, vanId)) {
          continue;
        }
        open.push({
          van: vanId,
          date,
          time,
          displayTime: formatBookingBlockDisplay(time),
          displayDate: formatShortDate(date),
        });
      }
    }
  }

  return open;
}

export function openVanSlotKey(van: VanId, date: string, time: string): string {
  return `${van}|${date}|${time}`;
}

export function buildOpenVanSlotKeySet(
  data: SchedulingData,
  options?: { from?: string; to?: string; van?: VanId }
): Set<string> {
  return new Set(
    listAvailableVanTimeslots(data.appointments, data.availability, options).map((slot) =>
      openVanSlotKey(slot.van, slot.date, slot.time)
    )
  );
}

export function buildEditorOpenSlotKeys(
  data: SchedulingData,
  groomerId: GroomerId,
  options?: { from?: string; to?: string; van?: VanId }
): string[] {
  const van = options?.van ?? vanForGroomer(groomerId);
  return [...buildOpenVanSlotKeySet(data, { ...options, van })].map((key) => {
    const [, date, time] = key.split("|");
    return `${date}|${time}`;
  });
}

/** Returns an error message when incoming shifts claim unavailable van slots. */
export function rejectUnavailableGroomerShifts(
  data: SchedulingData,
  groomerId: GroomerId,
  incoming: AvailabilityDay[]
): string | null {
  const today = getTodayPacificDate();
  const maxDate = getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS);
  const vanId = vanForGroomer(groomerId);
  const openKeys = buildOpenVanSlotKeySet(data, { from: today, to: maxDate, van: vanId });
  const existingByDate = new Map(
    data.availability
      .filter((day) => day.groomerId === groomerId)
      .map((day) => [day.date, day.times] as const)
  );

  for (const day of incoming) {
    for (const blockStart of BOOKING_BLOCK_STARTS) {
      if (!isBookingBlockEnabled(day.times, blockStart)) continue;
      const key = openVanSlotKey(vanId, day.date, blockStart);
      const hadBefore = isBookingBlockEnabled(existingByDate.get(day.date) ?? [], blockStart);
      if (!openKeys.has(key) && !hadBefore) {
        return `${formatBookingBlockDisplay(blockStart)} on ${day.date} is no longer available. Refresh and try again.`;
      }
    }
  }

  return null;
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

export function vanCapacitySummary(data: SchedulingData, options?: { van?: VanId }) {
  const today = getTodayPacificDate();
  const nearTermEnd = addMonthsToDate(today, 1);
  const range = { from: today, to: nearTermEnd, van: options?.van };
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
