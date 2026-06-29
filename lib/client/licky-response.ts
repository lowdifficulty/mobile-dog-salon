import type { AvailableSlot } from "@/lib/scheduling/types";

export const LICKY_MAX_CHARS = 100;

export type LickyButtonAction =
  | "book_slot"
  | "show_more_availability"
  | "show_availability"
  | "send_message";

export interface LickyButton {
  label: string;
  action: LickyButtonAction;
  payload?: Record<string, unknown>;
}

export interface LickyStructuredResponse {
  reply: string;
  buttons?: LickyButton[];
}

export function truncateLickyReply(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= LICKY_MAX_CHARS) return t;
  return t.slice(0, LICKY_MAX_CHARS - 1) + "…";
}

export function formatSlotButtonLabel(slot: AvailableSlot): string {
  const d = new Date(`${slot.date}T12:00:00`);
  const day = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
  const timeStart = slot.displayTime.split("–")[0]?.trim() ?? slot.displayTime;
  const groomer = slot.groomerName.split(/\s+/)[0];
  return `${day} ${timeStart} · ${groomer}`;
}

export function buildAvailabilityResponse(
  slots: AvailableSlot[],
  opts: {
    offset: number;
    service: string;
    days: number;
    groomerId?: string;
  }
): LickyStructuredResponse {
  if (!slots.length) {
    return {
      reply: truncateLickyReply("No open slots. Try another groomer or week!"),
    };
  }

  const offset = Math.max(0, opts.offset);
  const page = slots.slice(offset, offset + 3);
  const buttons: LickyButton[] = page.map((s) => ({
    label: formatSlotButtonLabel(s),
    action: "book_slot",
    payload: { slotKey: s.slotKey, service: opts.service },
  }));

  if (slots.length > offset + 3) {
    buttons.push({
      label: "Show more times",
      action: "show_more_availability",
      payload: {
        offset: offset + 3,
        service: opts.service,
        days: opts.days,
        groomerId: opts.groomerId ?? "",
      },
    });
  }

  return {
    reply: truncateLickyReply("Here are open times — pick one below!"),
    buttons,
  };
}

export function structuredFromText(text: string): LickyStructuredResponse {
  return { reply: truncateLickyReply(text) };
}
