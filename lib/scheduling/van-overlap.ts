import {
  availabilityBlockMinutesForGroomer,
  bookingBlockStartsForGroomer,
} from "./groomers";
import { isBookingBlockEnabled } from "./availability";
import { appointmentBlockMinutes } from "./services";
import {
  appointmentVan,
  availabilityVan,
  groomersForVan,
  isVanActiveOnDate,
  VAN_COUNT,
  vanForGroomer,
  type VanId,
} from "./vans";
import type { Appointment, AvailabilityDay, GroomerId } from "./types";

const PACIFIC_TZ = "America/Los_Angeles";

function slotToISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00-07:00`).toISOString();
}

function parseSlotFromIso(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return { date, time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` };
}

export interface VanOccupancyWindow {
  groomerId: GroomerId;
  date: string;
  time: string;
  start: Date;
  end: Date;
  source: "shift" | "appointment";
}

type OccupancyLookupOptions = {
  excludeGroomerId?: GroomerId;
  excludeAppointmentId?: string;
};

/** Per-request cache for van occupancy — avoids rescanning all appointments per timeslot. */
export class VanOccupancyIndex {
  private cache = new Map<string, VanOccupancyWindow[]>();
  private appointmentsByDate = new Map<string, Appointment[]>();
  private availabilityByKey = new Map<string, AvailabilityDay>();

  constructor(
    appointments: Appointment[],
    availability: AvailabilityDay[] = []
  ) {
    for (const ap of appointments) {
      if (ap.status === "cancelled") continue;
      const slot = parseSlotFromIso(ap.startAt);
      const list = this.appointmentsByDate.get(slot.date) ?? [];
      list.push(ap);
      this.appointmentsByDate.set(slot.date, list);
    }
    for (const day of availability) {
      this.availabilityByKey.set(
        day.van
          ? `${day.groomerId}|${day.date}|${day.van}`
          : `${day.groomerId}|${day.date}`,
        day
      );
    }
  }

  listWindows(
    date: string,
    vanId: VanId,
    options?: OccupancyLookupOptions
  ): VanOccupancyWindow[] {
    const key = `${date}|${vanId}|${options?.excludeGroomerId ?? ""}|${
      options?.excludeAppointmentId ?? ""
    }`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const windows: VanOccupancyWindow[] = [];

    for (const ap of this.appointmentsByDate.get(date) ?? []) {
      if (options?.excludeAppointmentId && ap.id === options.excludeAppointmentId) {
        continue;
      }
      if (appointmentVan(ap) !== vanId) continue;
      const slot = parseSlotFromIso(ap.startAt);
      const { start, end } = vanTimeWindow(
        slot.date,
        slot.time,
        ap.durationMinutes,
        ap.groomerId
      );
      windows.push({
        groomerId: ap.groomerId,
        date,
        time: slot.time,
        start,
        end,
        source: "appointment",
      });
    }

    for (const groomerId of groomersForVan(vanId)) {
      if (options?.excludeGroomerId && groomerId === options.excludeGroomerId) {
        continue;
      }
      const day =
        this.availabilityByKey.get(`${groomerId}|${date}|${vanId}`) ??
        this.availabilityByKey.get(`${groomerId}|${date}`);
      if (!day || availabilityVan(day) !== vanId) continue;
      const blockMinutes = availabilityBlockMinutesForGroomer(groomerId);
      for (const blockStart of bookingBlockStartsForGroomer(groomerId)) {
        if (!isBookingBlockEnabled(day.times, blockStart, blockMinutes)) continue;
        const { start, end } = vanTimeWindow(date, blockStart, blockMinutes, groomerId);
        windows.push({
          groomerId,
          date,
          time: blockStart,
          start,
          end,
          source: "shift",
        });
      }
    }

    this.cache.set(key, windows);
    return windows;
  }
}

function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

export function vanTimeWindow(
  date: string,
  time: string,
  durationMinutes: number,
  groomerId?: GroomerId
): { start: Date; end: Date } {
  const start = new Date(slotToISO(date, time));
  const end = new Date(
    start.getTime() +
      appointmentBlockMinutes(durationMinutes, groomerId) * 60 * 1000
  );
  return { start, end };
}

/** All shift and appointment windows occupying a van on one date. */
export function listVanOccupancyWindows(
  date: string,
  vanId: VanId,
  appointments: Appointment[],
  availability: AvailabilityDay[] = [],
  options?: {
    excludeGroomerId?: GroomerId;
    excludeAppointmentId?: string;
  }
): VanOccupancyWindow[] {
  const windows: VanOccupancyWindow[] = [];

  for (const ap of appointments) {
    if (ap.status === "cancelled") continue;
    if (options?.excludeAppointmentId && ap.id === options.excludeAppointmentId) {
      continue;
    }
    if (appointmentVan(ap) !== vanId) continue;
    const slot = parseSlotFromIso(ap.startAt);
    if (slot.date !== date) continue;
    const { start, end } = vanTimeWindow(
      slot.date,
      slot.time,
      ap.durationMinutes,
      ap.groomerId
    );
    windows.push({
      groomerId: ap.groomerId,
      date,
      time: slot.time,
      start,
      end,
      source: "appointment",
    });
  }

  for (const groomerId of groomersForVan(vanId)) {
    if (options?.excludeGroomerId && groomerId === options.excludeGroomerId) {
      continue;
    }
    const day = availability.find(
      (entry) =>
        entry.groomerId === groomerId &&
        entry.date === date &&
        availabilityVan(entry) === vanId
    );
    if (!day) continue;
    const blockMinutes = availabilityBlockMinutesForGroomer(groomerId);
    for (const blockStart of bookingBlockStartsForGroomer(groomerId)) {
      if (!isBookingBlockEnabled(day.times, blockStart, blockMinutes)) continue;
      const { start, end } = vanTimeWindow(date, blockStart, blockMinutes, groomerId);
      windows.push({
        groomerId,
        date,
        time: blockStart,
        start,
        end,
        source: "shift",
      });
    }
  }

  return windows;
}

/** True when the proposed window overlaps any appointment or shift on that van. */
export function isVanWindowOccupied(
  date: string,
  time: string,
  durationMinutes: number,
  vanId: VanId,
  appointments: Appointment[],
  availability: AvailabilityDay[] = [],
  options?: {
    excludeGroomerId?: GroomerId;
    excludeAppointmentId?: string;
    groomerId?: GroomerId;
    occupancyIndex?: VanOccupancyIndex;
  }
): boolean {
  const { start, end } = vanTimeWindow(
    date,
    time,
    durationMinutes,
    options?.groomerId
  );
  const windows = options?.occupancyIndex
    ? options.occupancyIndex.listWindows(date, vanId, options)
    : listVanOccupancyWindows(date, vanId, appointments, availability, options);
  return windows.some((window) => overlaps(start, end, window.start, window.end));
}

export function findVanWindowOccupant(
  date: string,
  time: string,
  durationMinutes: number,
  vanId: VanId,
  appointments: Appointment[],
  availability: AvailabilityDay[] = [],
  options?: {
    excludeGroomerId?: GroomerId;
    excludeAppointmentId?: string;
    groomerId?: GroomerId;
    occupancyIndex?: VanOccupancyIndex;
  }
): VanOccupancyWindow | null {
  const { start, end } = vanTimeWindow(
    date,
    time,
    durationMinutes,
    options?.groomerId
  );
  const windows = options?.occupancyIndex
    ? options.occupancyIndex.listWindows(date, vanId, options)
    : listVanOccupancyWindows(date, vanId, appointments, availability, options);
  for (const window of windows) {
    if (overlaps(start, end, window.start, window.end)) return window;
  }
  return null;
}

/** True if a van (or the full fleet when van omitted) already has a visit overlapping this window. */
export function isVanSlotTaken(
  date: string,
  time: string,
  durationMinutes: number,
  appointments: Appointment[],
  excludeAppointmentId?: string,
  vanId?: VanId,
  availability: AvailabilityDay[] = [],
  groomerId?: GroomerId,
  occupancyIndex?: VanOccupancyIndex
): boolean {
  if (vanId) {
    return isVanWindowOccupied(
      date,
      time,
      durationMinutes,
      vanId,
      appointments,
      availability,
      {
        excludeAppointmentId,
        excludeGroomerId: groomerId,
        groomerId,
        occupancyIndex,
      }
    );
  }

  const { start, end } = vanTimeWindow(date, time, durationMinutes);
  let overlapping = 0;
  for (const ap of appointments) {
    if (ap.id === excludeAppointmentId) continue;
    if (ap.status === "cancelled") continue;
    const apStart = new Date(ap.startAt);
    const apEnd = new Date(
      apStart.getTime() +
        appointmentBlockMinutes(ap.durationMinutes, ap.groomerId) * 60 * 1000
    );
    if (!overlaps(start, end, apStart, apEnd)) continue;
    overlapping += 1;
    if (overlapping >= VAN_COUNT) return true;
  }
  return false;
}
