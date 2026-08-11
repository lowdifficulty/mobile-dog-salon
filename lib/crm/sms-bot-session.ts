import "server-only";

import type { CrmContact, SmsBotSession, SmsBotSessionSlot } from "./types";
import { setContactSmsBotSession } from "./store";
import type { AvailableSlot } from "@/lib/scheduling/types";

const SESSION_TTL_MS = 30 * 60 * 1000;

export function smsBotSessionExpired(session: SmsBotSession | null | undefined): boolean {
  if (!session?.expiresAt) return true;
  return Date.now() > new Date(session.expiresAt).getTime();
}

/** Active multi-turn flow — compliance keywords should not hijack the reply. */
export function hasActiveSmsBotSession(session: SmsBotSession | null | undefined): boolean {
  return Boolean(session && !smsBotSessionExpired(session));
}

export function buildSmsBotSession(
  flow: SmsBotSession["flow"],
  partial: Omit<SmsBotSession, "flow" | "expiresAt"> = {}
): SmsBotSession {
  return {
    flow,
    ...partial,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  };
}

export function formatSmsSlotLabel(slot: AvailableSlot, index: number): string {
  const date = new Date(`${slot.date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
  return `${index}) ${date} ${slot.displayTime} ${slot.groomerName}`;
}

export function slotsToSessionOptions(slots: AvailableSlot[]): SmsBotSessionSlot[] {
  return slots.map((slot, i) => ({
    index: i + 1,
    slotKey: slot.slotKey,
    label: formatSmsSlotLabel(slot, i + 1),
  }));
}

export function formatSlotOptionsMessage(
  intro: string,
  options: SmsBotSessionSlot[]
): string {
  const lines = options.map((o) => o.label);
  return `${intro}\n${lines.join("\n")}\nReply with a number, or NO to stop.`;
}

export async function saveSmsBotSession(
  contact: CrmContact,
  session: SmsBotSession | null
): Promise<CrmContact> {
  const updated = await setContactSmsBotSession(contact.id, session);
  return updated ?? { ...contact, smsBotSession: session };
}

export async function clearSmsBotSession(contact: CrmContact): Promise<CrmContact> {
  return saveSmsBotSession(contact, null);
}

export function parseNumericChoice(body: string, max: number): number | null {
  const match = body.trim().match(/^(\d{1,2})$/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n < 1 || n > max) return null;
  return n;
}

export function isAffirmative(body: string): boolean {
  return /^(yes|y|confirm|ok|okay|sure|do it|book it)$/i.test(body.trim());
}

export function isNegative(body: string): boolean {
  return /^(no|n|never mind|nevermind|stop|cancel flow|abort)$/i.test(body.trim());
}
