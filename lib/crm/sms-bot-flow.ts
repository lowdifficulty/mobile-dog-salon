import "server-only";

import { companyLegal } from "@/lib/company-legal";
import type { CrmContact } from "./types";
import type { SmsBotConfig } from "./sms-bot-config";
import {
  buildSmsBotSession,
  clearSmsBotSession,
  formatSlotOptionsMessage,
  isAffirmative,
  isNegative,
  parseNumericChoice,
  saveSmsBotSession,
  smsBotSessionExpired,
} from "./sms-bot-session";
import {
  describeUpcoming,
  getPrimaryUpcomingAppointment,
  resolveSmsReschedulePreference,
  smsBookSlot,
  smsCancelUpcoming,
  smsListBookableSlots,
  smsRescheduleUpcoming,
} from "./sms-bot-actions";
import { looksLikeRescheduleRequest } from "@/lib/client/licky-reschedule-match";

export type SmsBotFlowResult = {
  reply: string;
  actionTaken?: "cancel" | "reschedule" | "book" | "session_cleared";
};

const BOOK_URL = `${companyLegal.siteUrl}/book`;

async function startCancelFlow(contact: CrmContact): Promise<SmsBotFlowResult> {
  const appt = await getPrimaryUpcomingAppointment(contact);
  if (!appt) {
    return {
      reply: `I don't see an upcoming appointment on this number. Book here: ${BOOK_URL}`,
    };
  }

  const session = buildSmsBotSession("confirm_cancel", { appointmentId: appt.id });
  await saveSmsBotSession(contact, session);

  return {
    reply: `Cancel ${describeUpcoming(appt)}? Reply YES to confirm or NO to keep it.`,
  };
}

async function startRescheduleFlow(
  contact: CrmContact,
  preference: string
): Promise<SmsBotFlowResult> {
  const appt = await getPrimaryUpcomingAppointment(contact);
  if (!appt) {
    return {
      reply: `No upcoming visit to move. Book a new time: ${BOOK_URL}`,
    };
  }

  const resolved = await resolveSmsReschedulePreference(contact, appt, preference);
  if (resolved.kind === "confirm" && resolved.slot) {
    const session = buildSmsBotSession("confirm_reschedule", {
      appointmentId: appt.id,
      slotKey: resolved.slot.slotKey,
      service: appt.service,
    });
    await saveSmsBotSession(contact, session);
    return {
      reply: `${resolved.preview} Reply YES to confirm — I will not change it until you do.`,
    };
  }

  const slots = resolved.slots;
  if (!slots.length) {
    return {
      reply: `No open times in the next 2 weeks for ${appt.groomerId}. Your visit is still ${describeUpcoming(appt)}. Call ${companyLegal.businessPhoneDisplay} and we'll help.`,
    };
  }

  const session = buildSmsBotSession("pick_reschedule", {
    appointmentId: appt.id,
    slots,
    service: appt.service,
  });
  await saveSmsBotSession(contact, session);

  return {
    reply: formatSlotOptionsMessage(
      resolved.preview || `Move ${describeUpcoming(appt)}. Pick a new time:`,
      slots
    ),
  };
}

async function statusReply(contact: CrmContact): Promise<SmsBotFlowResult> {
  const appt = await getPrimaryUpcomingAppointment(contact);
  if (!appt) {
    return {
      reply: `I don't see an upcoming appointment on this number. Book here: ${BOOK_URL}`,
    };
  }
  return {
    reply: `Yes — you're confirmed: ${describeUpcoming(appt)}. See you then! Reply RESCHEDULE to move it, or CANCEL if you need to change it.`,
  };
}

async function startBookFlow(
  contact: CrmContact,
  preference: string
): Promise<SmsBotFlowResult> {
  const upcoming = await getPrimaryUpcomingAppointment(contact);
  const wantsAnother = /\b(another|new|also|second|rebook|additional)\b/.test(
    preference.toLowerCase()
  );
  if (upcoming && !wantsAnother) {
    return statusReply(contact);
  }

  const { slots, service } = await smsListBookableSlots(contact, { preference });

  if (!slots.length) {
    return {
      reply: `No open slots in the next 2 weeks. Try ${BOOK_URL} or call ${companyLegal.businessPhoneDisplay}.`,
    };
  }

  const session = buildSmsBotSession("pick_book", { slots, service });
  await saveSmsBotSession(contact, session);

  return {
    reply: formatSlotOptionsMessage("Here are open times:", slots),
  };
}

async function continueSession(
  contact: CrmContact,
  body: string
): Promise<SmsBotFlowResult | null> {
  const session = contact.smsBotSession;
  if (!session || smsBotSessionExpired(session)) {
    if (session) {
      await clearSmsBotSession(contact);
    }
    return null;
  }

  if (isNegative(body)) {
    await clearSmsBotSession(contact);
    return { reply: "No problem — nothing was changed.", actionTaken: "session_cleared" };
  }

  const picking = session.flow === "pick_reschedule" || session.flow === "pick_book";
  const text = body.toLowerCase();
  if (
    picking &&
    !parseNumericChoice(body, session.slots?.length ?? 0) &&
    (wantsStatus(text) || wantsCancel(text, body) || wantsReschedule(text))
  ) {
    await clearSmsBotSession(contact);
    return null;
  }

  if (session.flow === "confirm_cancel") {
    if (!isAffirmative(body)) {
      return {
        reply: `Reply YES to cancel your appointment, or NO to keep it.`,
      };
    }
    const result = await smsCancelUpcoming(contact, session.appointmentId!);
    await clearSmsBotSession(contact);
    if (!result.ok) {
      return { reply: result.error };
    }
    return { reply: result.message, actionTaken: "cancel" };
  }

  if (session.flow === "pick_reschedule") {
    const choice = parseNumericChoice(body, session.slots?.length ?? 0);
    if (!choice) {
      return { reply: "Reply with the number of the time you want (e.g. 2), or NO to stop." };
    }
    const picked = session.slots!.find((s) => s.index === choice)!;
    const next = buildSmsBotSession("confirm_reschedule", {
      appointmentId: session.appointmentId,
      slotKey: picked.slotKey,
      service: session.service,
    });
    await saveSmsBotSession(contact, next);
    return {
      reply: `Move to ${picked.label.replace(/^\d+\)\s*/, "")}? Reply YES to confirm.`,
    };
  }

  if (session.flow === "confirm_reschedule") {
    if (!isAffirmative(body)) {
      return { reply: "Reply YES to confirm the new time, or NO to cancel." };
    }
    const result = await smsRescheduleUpcoming(
      contact,
      session.appointmentId!,
      session.slotKey!
    );
    await clearSmsBotSession(contact);
    if (!result.ok) {
      return { reply: result.error };
    }
    return { reply: result.message, actionTaken: "reschedule" };
  }

  if (session.flow === "pick_book") {
    const choice = parseNumericChoice(body, session.slots?.length ?? 0);
    if (!choice) {
      return { reply: "Reply with the number of the time you want (e.g. 1), or NO to stop." };
    }
    const picked = session.slots!.find((s) => s.index === choice)!;
    const next = buildSmsBotSession("confirm_book", {
      slotKey: picked.slotKey,
      service: session.service,
      slots: session.slots,
    });
    await saveSmsBotSession(contact, next);
    return {
      reply: `Book ${picked.label.replace(/^\d+\)\s*/, "")}? Reply YES to confirm.`,
    };
  }

  if (session.flow === "confirm_book") {
    if (!isAffirmative(body)) {
      return { reply: "Reply YES to confirm booking, or NO to stop." };
    }
    const result = await smsBookSlot(
      contact,
      session.slotKey!,
      session.service || "full-groom"
    );
    await clearSmsBotSession(contact);
    if (!result.ok) {
      return { reply: result.error };
    }
    return { reply: result.message, actionTaken: "book" };
  }

  return null;
}

function wantsCancel(text: string, raw: string): boolean {
  if (/^cancel$/i.test(raw.trim())) return true;
  return (
    /\bcancel my\b/.test(text) ||
    /\bwant to cancel\b/.test(text) ||
    (/\bcancel\b/.test(text) &&
      /\b(appt|appointment|visit|booking|groom)\b/.test(text))
  );
}

function wantsReschedule(text: string): boolean {
  return looksLikeRescheduleRequest(text);
}

function wantsStatus(text: string): boolean {
  if (
    /\b(confirm|confirmation|confirmed|status|what time|what day|when is|when'?s)\b/.test(
      text
    )
  ) {
    return true;
  }
  if (
    /\b(i thought|i have|do i have|still have|already (have|booked)|my (appt|appointment|visit|booking))\b/.test(
      text
    )
  ) {
    return true;
  }
  if (
    /\b(tomorrow|today)\b/.test(text) &&
    /\b(appt|appointment|groom|visit|12:?00|noon)\b/.test(text)
  ) {
    return true;
  }
  return false;
}

function wantsBook(text: string): boolean {
  if (
    wantsStatus(text) &&
    !/\b(rebook|another|new (appt|appointment)|book another|schedule another)\b/.test(
      text
    )
  ) {
    return false;
  }
  if (/\b(rebook|reserve)\b/.test(text)) return true;
  if (/\b(book|schedule)\b/.test(text)) return true;
  if (/\b(new|another|different)\s+(appt|appointment|visit|booking)\b/.test(text)) {
    return true;
  }
  return false;
}

/**
 * Multi-turn SMS flows for book, cancel, and reschedule.
 * Returns null when no action flow handled the message.
 */
export async function runSmsBotActionFlow(
  contact: CrmContact,
  inboundBody: string,
  config: SmsBotConfig
): Promise<SmsBotFlowResult | null> {
  if (config.enableActions === false) return null;

  const body = inboundBody.trim();
  if (!body) return null;

  const continued = await continueSession(contact, body);
  if (continued) return continued;

  const text = body.toLowerCase();

  if (wantsCancel(text, body)) {
    return startCancelFlow(contact);
  }

  if (wantsReschedule(text)) {
    return startRescheduleFlow(contact, body);
  }

  if (wantsStatus(text)) {
    return statusReply(contact);
  }

  if (wantsBook(text)) {
    return startBookFlow(contact, body);
  }

  return null;
}
