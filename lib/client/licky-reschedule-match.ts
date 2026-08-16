import {
  bookingBlockStartsForGroomer,
  bookingDurationMinutesForGroomer,
  formatDisplayTime,
} from "@/lib/scheduling/groomers";
import type { AvailableSlot, GroomerId } from "@/lib/scheduling/types";

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function inferPeriod(hour: number, explicit?: string): "am" | "pm" {
  if (explicit) return explicit.toLowerCase().startsWith("p") ? "pm" : "am";
  if (hour === 12) return "pm";
  if (hour >= 1 && hour <= 7) return "pm";
  return "am";
}

/** Parse "10:30am", "10:30", "2pm", "14:00" into minutes from midnight. */
export function parseClockMinutes(text: string): number | null {
  const t = text.toLowerCase();

  const twentyFour = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  const withMeridiem = t.match(
    /\b(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/
  );
  if (withMeridiem) {
    let hour = Number(withMeridiem[1]);
    const minute = withMeridiem[2] != null ? Number(withMeridiem[2]) : 0;
    if (!Number.isFinite(hour) || hour < 1 || hour > 12) return null;
    const period = inferPeriod(hour, withMeridiem[3]);
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    return hour * 60 + minute;
  }

  if (twentyFour) {
    const hour = Number(twentyFour[1]);
    const minute = Number(twentyFour[2]);
    if (hour > 23 || minute > 59) return null;
    return hour * 60 + minute;
  }

  const oclock = t.match(/\b(\d{1,2})\s*o'?clock\b/);
  if (oclock) {
    let hour = Number(oclock[1]);
    if (!Number.isFinite(hour) || hour < 1 || hour > 12) return null;
    const period = inferPeriod(hour);
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
    return hour * 60;
  }

  return null;
}

export function formatClockLabel(hhmmOrMinutes: string | number): string {
  const hhmm =
    typeof hhmmOrMinutes === "number"
      ? minutesToHHMM(hhmmOrMinutes)
      : hhmmOrMinutes;
  return formatDisplayTime(hhmm);
}

export function bookingBlockForClock(
  groomerId: GroomerId,
  clockMinutes: number
): string {
  const starts = bookingBlockStartsForGroomer(groomerId);
  const duration = bookingDurationMinutesForGroomer(groomerId);
  for (let i = starts.length - 1; i >= 0; i--) {
    const start = timeToMinutes(starts[i]);
    if (clockMinutes >= start && clockMinutes < start + duration) {
      return starts[i];
    }
  }
  if (clockMinutes < timeToMinutes(starts[0])) return starts[0];
  return starts[starts.length - 1];
}

export function nextBookingBlock(
  groomerId: GroomerId,
  time24: string
): string | null {
  const starts = bookingBlockStartsForGroomer(groomerId);
  const idx = (starts as readonly string[]).indexOf(time24);
  if (idx >= 0) return starts[idx + 1] ?? null;
  const mins = timeToMinutes(time24);
  return starts.find((s) => timeToMinutes(s) > mins) ?? null;
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export function parseRescheduleDate(
  text: string,
  fallbackDate: string
): string | null {
  const t = text.toLowerCase();
  if (/\btomorrow\b/.test(t)) return addDays(fallbackDate, 1);

  const iso = t.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];

  const slash = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const month = slash[1].padStart(2, "0");
    const day = slash[2].padStart(2, "0");
    const year = slash[3]
      ? slash[3].length === 2
        ? `20${slash[3]}`
        : slash[3]
      : fallbackDate.slice(0, 4);
    return `${year}-${month}-${day}`;
  }

  for (let i = 0; i < WEEKDAYS.length; i++) {
    const name = WEEKDAYS[i];
    if (!new RegExp(`\\b(next\\s+)?${name}\\b`).test(t)) continue;
    const from = new Date(`${fallbackDate}T12:00:00`);
    let delta = (i - from.getDay() + 7) % 7;
    if (delta === 0 || /\bnext\b/.test(t)) delta = delta === 0 ? 7 : delta;
    return addDays(fallbackDate, delta);
  }

  return null;
}

export function looksLikeRescheduleRequest(text: string): boolean {
  const t = text.toLowerCase();
  if (
    /\b(how do i|how to|what does)\b/.test(t) &&
    parseClockMinutes(t) == null
  ) {
    return false;
  }
  if (/\b(reschedule|re-schedule)\b/.test(t)) return true;
  if (/\bmove my\b/.test(t)) return true;
  if (
    /\bchange my\b/.test(t) &&
    /\b(appt|appointment|visit|time|slot|booking|groom)\b/.test(t)
  ) {
    return true;
  }
  if (
    /\b(move|switch|change|push|bump)\b/.test(t) &&
    /\b(appt|appointment|visit|time|slot|booking|groom)\b/.test(t)
  ) {
    return true;
  }
  if (
    /\b(instead|later|earlier|different time|another time)\b/.test(t) &&
    (parseClockMinutes(t) != null ||
      /\b(morning|afternoon|evening)\b/.test(t))
  ) {
    return true;
  }
  if (
    /\b(can i|can we|could i|could we)\b/.test(t) &&
    parseClockMinutes(t) != null &&
    /\b(come|do|be|have|book|move|change)\b/.test(t)
  ) {
    return true;
  }
  if (
    /\b(change|move|switch|make it|do)\b/.test(t) &&
    parseClockMinutes(t) != null
  ) {
    return true;
  }
  return false;
}

export function isRescheduleConfirmYes(text: string): boolean {
  return /^(yes|y|yep|yeah|confirm|ok|okay|sure|do it|please do|go ahead)\b/i.test(
    text.trim()
  );
}

export function isRescheduleConfirmNo(text: string): boolean {
  return /^(no|n|nope|never mind|nevermind|stop|keep it|don't|dont)\b/i.test(
    text.trim()
  );
}

export type RescheduleMatch =
  | {
      status: "target";
      slot: AvailableSlot;
      requestedClock?: string;
      mappedFromSameWindow: boolean;
    }
  | {
      status: "pick";
      alternatives: AvailableSlot[];
      requestedClock?: string;
    }
  | {
      status: "unavailable";
      alternatives: AvailableSlot[];
      requestedClock?: string;
    };

function slotKeyOf(slot: AvailableSlot): string {
  return slot.slotKey || `${slot.groomerId}|${slot.date}|${slot.time}`;
}

function isCurrentSlot(
  slot: AvailableSlot,
  current: { date: string; time: string; groomerId: GroomerId }
): boolean {
  return (
    slot.groomerId === current.groomerId &&
    slot.date === current.date &&
    slot.time === current.time
  );
}

function closenessScore(slot: AvailableSlot, date: string, timeMins: number): number {
  let score = 0;
  if (slot.date === date) score += 50;
  score += Math.max(0, 40 - Math.abs(timeToMinutes(slot.time) - timeMins) / 6);
  return score;
}

export function resolveRescheduleTarget(opts: {
  currentDate: string;
  currentTime: string;
  currentGroomerId: GroomerId;
  preference: string;
  openSlots: AvailableSlot[];
}): RescheduleMatch {
  const current = {
    date: opts.currentDate,
    time: opts.currentTime,
    groomerId: opts.currentGroomerId,
  };
  const open = opts.openSlots.filter((s) => !isCurrentSlot(s, current));
  const sameGroomer = open.filter((s) => s.groomerId === current.groomerId);
  const pool = sameGroomer.length ? sameGroomer : open;

  const clockMins = parseClockMinutes(opts.preference);
  const targetDate =
    parseRescheduleDate(opts.preference, current.date) ?? current.date;
  const requestedClock =
    clockMins != null ? formatClockLabel(clockMins) : undefined;

  if (clockMins != null) {
    const targetBlock = bookingBlockForClock(current.groomerId, clockMins);
    const sameWindow =
      targetBlock === current.time && targetDate === current.date;

    if (sameWindow) {
      const next = nextBookingBlock(current.groomerId, current.time);
      const later = next
        ? pool.find((s) => s.date === current.date && s.time === next)
        : undefined;
      if (later) {
        return {
          status: "target",
          slot: later,
          requestedClock,
          mappedFromSameWindow: true,
        };
      }
      return {
        status: "unavailable",
        requestedClock,
        alternatives: pool.slice(0, 5),
      };
    }

    const exact =
      pool.find((s) => s.date === targetDate && s.time === targetBlock) ??
      open.find((s) => s.date === targetDate && s.time === targetBlock);
    if (exact) {
      return {
        status: "target",
        slot: exact,
        requestedClock,
        mappedFromSameWindow: false,
      };
    }

    const ranked = [...pool]
      .map((slot) => ({
        slot,
        score: closenessScore(slot, targetDate, clockMins),
      }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.slot)
      .slice(0, 5);

    return {
      status: ranked.length ? "pick" : "unavailable",
      requestedClock,
      alternatives: ranked,
    };
  }

  const dateOnly = parseRescheduleDate(opts.preference, current.date);
  if (dateOnly) {
    const onDate = pool.filter((s) => s.date === dateOnly);
    if (onDate.length === 1) {
      return {
        status: "target",
        slot: onDate[0],
        mappedFromSameWindow: false,
      };
    }
    return {
      status: onDate.length ? "pick" : "unavailable",
      alternatives: (onDate.length ? onDate : pool).slice(0, 5),
    };
  }

  if (!opts.preference.trim() || looksLikeRescheduleRequest(opts.preference)) {
    return {
      status: "pick",
      alternatives: pool.slice(0, 5),
    };
  }

  return {
    status: pool.length ? "pick" : "unavailable",
    alternatives: pool.slice(0, 5),
  };
}

export function findSlotByKey(
  slots: AvailableSlot[],
  slotKey: string
): AvailableSlot | undefined {
  return slots.find((s) => slotKeyOf(s) === slotKey);
}
