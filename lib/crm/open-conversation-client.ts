export const CRM_OPEN_CONTACT_SESSION_KEY = "mds-crm-open-contact";

/** Stash a CRM contact id so CrmPanel opens that thread on the next mount. */
export function stashCrmOpenContact(contactId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CRM_OPEN_CONTACT_SESSION_KEY, contactId);
  } catch {
    /* ignore */
  }
}
