import "server-only";
import { SITE_URL } from "@/lib/site-url";

/** Short link groomers tap from new-booking SMS → opens CRM conversation for that client. */
export function groomerConversationShortPath(code: string): string {
  return `/groomer/c/${code.trim().toLowerCase()}`;
}

export function groomerConversationShortUrl(code: string, base = SITE_URL): string {
  return `${base.replace(/\/$/, "")}${groomerConversationShortPath(code)}`;
}
