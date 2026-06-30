import "server-only";

import type { AvailableSlot } from "@/lib/scheduling/types";
import { addDays, getTodayPacificDate } from "@/lib/scheduling/slots";

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function matchesTimeOfDay(displayTime: string, hint: string): boolean {
  const lower = displayTime.toLowerCase();
  if (/\bmorning\b|\bearly\b/i.test(hint)) {
    return /\b(8|9|10|11):.*am\b/.test(lower) || lower.startsWith("8:") || lower.startsWith("9:");
  }
  if (/\bafternoon\b|\bmidday\b|\bnoon\b/i.test(hint)) {
    return /\b(11|12|1|2|3|4):.*(am|pm)\b/.test(lower);
  }
  if (/\bevening\b|\blate\b/i.test(hint)) {
    return /\b(5|6|7|8):.*pm\b/.test(lower);
  }
  return true;
}

function parseTargetDate(text: string, fromDate: string): string | null {
  const t = text.toLowerCase();

  if (/\btomorrow\b/.test(t)) return addDays(fromDate, 1);

  const isoMatch = t.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoMatch?.[1]) return isoMatch[1];

  const slashMatch = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3]
      ? slashMatch[3].length === 2
        ? `20${slashMatch[3]}`
        : slashMatch[3]
      : fromDate.slice(0, 4);
    return `${year}-${month}-${day}`;
  }

  for (let i = 0; i < WEEKDAYS.length; i++) {
    const name = WEEKDAYS[i];
    if (!new RegExp(`\\b(next\\s+)?${name}\\b`).test(t)) continue;
    const from = new Date(`${fromDate}T12:00:00`);
    let delta = (i - from.getDay() + 7) % 7;
    if (delta === 0 || /\bnext\b/.test(t)) delta = delta === 0 ? 7 : delta;
    return addDays(fromDate, delta);
  }

  return null;
}

function scoreSlot(
  slot: AvailableSlot,
  opts: {
    preference: string;
    groomerId?: string;
    targetDate?: string | null;
  }
): number {
  let score = 0;
  const pref = opts.preference.toLowerCase();

  if (opts.groomerId && slot.groomerId === opts.groomerId) score += 40;
  if (/\bmelanie\b/.test(pref) && slot.groomerId === "melanie") score += 35;
  if (/\b(diamond|sarah)\b/.test(pref) && slot.groomerId === "diamond") score += 35;

  if (opts.targetDate && slot.date === opts.targetDate) score += 50;
  else if (opts.targetDate) {
    const diff = Math.abs(
      new Date(`${slot.date}T12:00:00`).getTime() -
        new Date(`${opts.targetDate}T12:00:00`).getTime()
    );
    const daysDiff = diff / (86400000);
    if (daysDiff <= 1) score += 20;
    else if (daysDiff <= 3) score += 5;
  }

  if (matchesTimeOfDay(slot.displayTime, pref)) score += 15;

  if (slot.displayTime.toLowerCase().includes(pref.trim())) score += 25;

  return score;
}

export function rankSlotsForPreference(
  slots: AvailableSlot[],
  opts: {
    preference?: string;
    groomerId?: string;
    date?: string;
    limit?: number;
  }
): AvailableSlot[] {
  const preference = [opts.preference, opts.date, opts.groomerId]
    .filter(Boolean)
    .join(" ");
  if (!preference.trim()) return slots.slice(0, opts.limit ?? 5);

  const fromDate = getTodayPacificDate();
  const targetDate = opts.date?.match(/^\d{4}-\d{2}-\d{2}$/)
    ? opts.date
    : parseTargetDate(preference, fromDate);

  const ranked = [...slots]
    .map((slot) => ({
      slot,
      score: scoreSlot(slot, {
        preference,
        groomerId: opts.groomerId,
        targetDate,
      }),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.slot.date.localeCompare(b.slot.date));

  if (!ranked.length) return slots.slice(0, opts.limit ?? 5);
  return ranked.slice(0, opts.limit ?? 5).map((r) => r.slot);
}

export function formatSlotLine(slot: AvailableSlot): string {
  return `${slot.date} ${slot.displayTime} — ${slot.groomerName} | slot_key: ${slot.slotKey}`;
}
