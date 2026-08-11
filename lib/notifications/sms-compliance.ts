/**
 * SMS compliance keyword detection.
 *
 * CANCEL is intentionally NOT an opt-out keyword — customers text it to cancel
 * grooming appointments. Treating it as opt-out breaks TCPA metrics and blocks
 * the cancel flow.
 */

/** True when the message is a carrier/TCPA opt-out (single keyword or keyword + ALL). */
export function isSmsOptOutMessage(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return /^(STOP|UNSUBSCRIBE|END|QUIT)(\s+ALL)?$/.test(normalized);
}

/** True when the message re-subscribes the number to SMS. */
export function isSmsOptInMessage(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  // YES is used for bot confirmations (cancel/reschedule/book) — not opt-in.
  return /^(START|UNSTOP)$/.test(normalized);
}

/** True when the message requests SMS program help. */
export function isSmsHelpMessage(body: string): boolean {
  const normalized = body.trim().toUpperCase();
  return /^(HELP|INFO)$/.test(normalized);
}

/** Single-word compliance keywords — webhook handles these before the bot replies. */
export const SMS_COMPLIANCE_KEYWORDS = new Set([
  "STOP",
  "HELP",
  "UNSUBSCRIBE",
  "END",
  "QUIT",
  "INFO",
]);

/** True when a lone keyword should start the appointment cancel flow (not opt-out). */
export function isAppointmentCancelKeyword(body: string): boolean {
  return /^cancel$/i.test(body.trim());
}
