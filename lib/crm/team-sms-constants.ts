/** Fixed CRM contact id for the internal team SMS thread. Safe for client imports. */
export const TEAM_SMS_CONTACT_ID = "team-sms";

/** Mary sends from the main business line — not an SMS recipient chip. */
export const TEAM_SMS_SENDER_LABEL = "Mary (business line)";

/** Default internal team SMS recipients (10-digit US). */
export const TEAM_SMS_ROSTER = {
  melanie: "7142517732",
  jessica: "6823665544",
  chris: "6616747893",
  matthew: "9493863351",
} as const;

export function isTeamSmsContactId(id: string | undefined | null): boolean {
  return id === TEAM_SMS_CONTACT_ID;
}
