import "server-only";

import type { ChatMessage } from "@/lib/client/licky-types";
import type { LickyActionContext } from "@/lib/client/licky-context";
import { parseClientAddressMessage } from "@/lib/client/licky-address";
import {
  parseContactMessage,
  saveContactToCtx,
  saveServiceAddressToCtx,
} from "@/lib/client/licky-guest-helpers";
import { normalizePetSize } from "@/lib/pricing";

const SERVICE_PATTERNS: { re: RegExp; service: string }[] = [
  { re: /\bbath\s*(?:&|and)?\s*brush\b|\bbath only\b|\bjust a bath\b/i, service: "bath-brush" },
  { re: /\bfull\s*groom\b|\bhaircut\b|\bgroom\b/i, service: "full-groom" },
];

const PET_SIZE_PATTERNS: { re: RegExp; size: string }[] = [
  { re: /\b(extra[- ]?large|xl|giant)\b/i, size: "large" },
  { re: /\b(large|big)\b(?:\s+(?:dog|pup|pet|breed))?/i, size: "large" },
  { re: /\b(medium|med)\b(?:\s+(?:dog|pup|pet))?/i, size: "medium" },
  { re: /\b(small|little|tiny)\b(?:\s+(?:dog|pup|pet))?/i, size: "small" },
];

export interface ConversationBookingHints {
  service?: string;
  petSize?: string;
  petName?: string;
  groomerHint?: "melanie" | "diamond";
}

/** Scan the full chat for address, contact, pet, and service hints. */
export function extractConversationHints(
  messages: ChatMessage[],
  ctx: LickyActionContext
): ConversationBookingHints {
  const hints: ConversationBookingHints = {};
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");

  for (const { re, service } of SERVICE_PATTERNS) {
    if (re.test(userText)) {
      hints.service = service;
      break;
    }
  }

  for (const { re, size } of PET_SIZE_PATTERNS) {
    if (re.test(userText)) {
      hints.petSize = size;
      break;
    }
  }

  if (/\bmelanie\b/i.test(userText)) hints.groomerHint = "melanie";
  else if (/\b(diamond|sarah)\b/i.test(userText)) hints.groomerHint = "diamond";

  const petNameMatch = userText.match(
    /\b(?:dog(?:'s|s)?|pup(?:'s|s)?|pet(?:'s|s)?)\s+(?:named?|is|called)\s+([A-Z][a-zA-Z'-]{1,24})/i
  );
  if (petNameMatch?.[1]) hints.petName = petNameMatch[1];

  if (ctx.guest?.petSize && !hints.petSize) hints.petSize = ctx.guest.petSize;
  if (ctx.account?.petProfile?.pets?.[0]?.petSize && !hints.petSize) {
    hints.petSize = ctx.account.petProfile.pets[0].petSize;
  }

  return hints;
}

/** Persist anything found in the conversation into session / guest state. */
export async function syncConversationToCtx(
  ctx: LickyActionContext,
  messages: ChatMessage[]
): Promise<void> {
  const userMessages = messages.filter((m) => m.role === "user");

  for (const msg of userMessages) {
    const address = parseClientAddressMessage(msg.content);
    if (address) {
      await saveServiceAddressToCtx(ctx, address);
    }

    const contact = parseContactMessage(msg.content);
    if (contact && !ctx.loggedIn) {
      await saveContactToCtx(ctx, contact);
    }
  }

  const hints = extractConversationHints(messages, ctx);
  const guestPatch: Record<string, string> = {};

  if (hints.petSize) {
    const size = normalizePetSize(hints.petSize);
    if (size) guestPatch.petSize = size;
  }
  if (hints.petName && !ctx.guest?.petName) guestPatch.petName = hints.petName;

  if (!ctx.loggedIn && Object.keys(guestPatch).length) {
    await ctx.saveGuest?.(guestPatch);
  }
}

export function summarizeBookingReadiness(ctx: LickyActionContext): string {
  const lines: string[] = [];
  const pending = ctx.account?.pendingLickyBooking ?? ctx.guest?.pendingLickyBooking;

  if (pending?.slotKey) {
    lines.push(`Selected slot: ${pending.slotKey} (${pending.service})`);
  } else {
    lines.push("Selected slot: none yet");
  }

  if (ctx.account) {
    lines.push(`Logged in as ${ctx.account.firstName} ${ctx.account.lastName}`);
    lines.push(`Phone on file: ${ctx.account.phone || "missing"}`);
    lines.push(
      `Address on file: ${
        ctx.account.serviceAddress
          ? `${ctx.account.serviceAddress.address}, ${ctx.account.serviceAddress.city}`
          : "not saved yet"
      }`
    );
    if (ctx.account.petProfile?.pets?.[0]) {
      const p = ctx.account.petProfile.pets[0];
      lines.push(`Pet: ${p.petName || "unnamed"} (${p.petSize || "size unknown"})`);
    }
  } else {
    lines.push("Guest (not logged in)");
    if (ctx.guest?.firstName) {
      lines.push(`Name: ${ctx.guest.firstName} ${ctx.guest.lastName ?? ""}`.trim());
    }
    if (ctx.guest?.phone) lines.push(`Phone: ${ctx.guest.phone}`);
    if (ctx.guest?.serviceAddress) {
      lines.push(
        `Address: ${ctx.guest.serviceAddress.address}, ${ctx.guest.serviceAddress.city} ${ctx.guest.serviceAddress.zipCode}`
      );
    }
    if (ctx.guest?.petSize) lines.push(`Pet size: ${ctx.guest.petSize}`);
    if (ctx.guest?.petName) lines.push(`Pet name: ${ctx.guest.petName}`);
  }

  const missing: string[] = [];
  if (!pending?.slotKey) missing.push("appointment time (use find_slot or check_availability)");
  const hasAddress = Boolean(
    ctx.account?.serviceAddress ||
      (ctx.guest?.serviceAddress?.address && ctx.guest.serviceAddress.zipCode)
  );
  if (!hasAddress) missing.push("service address");
  if (!ctx.loggedIn && !ctx.guest?.phone?.replace(/\D/g, "").match(/\d{10}/)) {
    missing.push("guest name and mobile number");
  }

  if (missing.length) {
    lines.push(`Still needed to complete booking: ${missing.join("; ")}`);
  } else {
    lines.push("Ready to call book_appointment when the client confirms.");
  }

  return lines.join("\n");
}
