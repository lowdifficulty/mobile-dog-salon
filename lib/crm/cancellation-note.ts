import "server-only";

import { randomUUID } from "crypto";
import { cancelMethodLabel, resolveCancelMethod } from "@/lib/scheduling/cancel-method";
import type { Appointment } from "@/lib/scheduling/types";
import { appendInteraction, findContactByPhone } from "./store";

function formatVisitWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Append a CRM system note when a visit is cancelled, so Conversations shows method. */
export async function recordAppointmentCancelledNote(
  appointment: Appointment
): Promise<void> {
  const contact = await findContactByPhone(appointment.phone);
  if (!contact) return;

  const method = resolveCancelMethod(appointment);
  const methodLabel = cancelMethodLabel(method);
  const pet = appointment.petName?.trim() || "their pet";
  const when = formatVisitWhen(appointment.startAt);

  await appendInteraction({
    id: randomUUID(),
    contactId: contact.id,
    phone: contact.phone,
    channel: "system",
    direction: "internal",
    actor: "system",
    summary: `Cancelled via ${methodLabel}`,
    body: `Cancelled · ${when} · ${pet} · ${appointment.service}\nVia ${methodLabel}`,
    createdAt: appointment.cancelledAt || new Date().toISOString(),
    metadata: {
      appointmentId: appointment.id,
      appointmentStatus: "cancelled",
      cancelledVia: method,
      cancelledBy: appointment.cancelledBy ?? null,
    },
  });
}
