/** Fixed CRM contact id for the internal team SMS thread. Safe for client imports. */
export const TEAM_SMS_CONTACT_ID = "team-sms";

export function isTeamSmsContactId(id: string | undefined | null): boolean {
  return id === TEAM_SMS_CONTACT_ID;
}
