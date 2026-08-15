export type AppointmentCancelMethod =
  | "sms_bot"
  | "licky_chat"
  | "my_appointment"
  | "staff"
  | "admin"
  | "unknown";

export const CANCEL_METHOD_LABELS: Record<AppointmentCancelMethod, string> = {
  sms_bot: "Customer SMS / Hattie SMS",
  licky_chat: "Hattie chat",
  my_appointment: "My Appointment / website",
  staff: "Staff / groomer calendar",
  admin: "Admin",
  unknown: "Unknown",
};

const METHODS = new Set<string>(Object.keys(CANCEL_METHOD_LABELS));

export function isCancelMethod(value: unknown): value is AppointmentCancelMethod {
  return typeof value === "string" && METHODS.has(value);
}

export function inferCancelMethod(actor?: string | null): AppointmentCancelMethod {
  if (!actor) return "unknown";
  const a = actor.trim().toLowerCase();
  if (!a) return "unknown";
  if (a.startsWith("sms-bot")) return "sms_bot";
  if (a.startsWith("licky:") || a.startsWith("hattie:")) return "licky_chat";
  if (a.startsWith("public:") || a.startsWith("client:")) return "my_appointment";
  if (a.startsWith("staff:")) return "staff";
  if (a.startsWith("admin:") || a === "admin") return "admin";
  return "unknown";
}

export function resolveCancelMethod(appointment?: {
  cancelledVia?: string | null;
  cancelledBy?: string | null;
} | null): AppointmentCancelMethod {
  if (!appointment) return "unknown";
  if (isCancelMethod(appointment.cancelledVia)) return appointment.cancelledVia;
  return inferCancelMethod(appointment.cancelledBy);
}

export function cancelMethodLabel(
  method?: AppointmentCancelMethod | string | null
): string {
  if (isCancelMethod(method)) return CANCEL_METHOD_LABELS[method];
  return CANCEL_METHOD_LABELS.unknown;
}
