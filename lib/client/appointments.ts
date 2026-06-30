import "server-only";

import { normalizePhone } from "@/lib/leads/normalize";
import { readSchedulingData } from "@/lib/scheduling/store";
import type { Appointment } from "@/lib/scheduling/types";
import type { ClientAccount } from "@/lib/payments/types";

export function clientOwnsAppointment(
  client: Pick<ClientAccount, "phone" | "email" | "appointmentIds">,
  appointment: Appointment
): boolean {
  if (client.appointmentIds?.includes(appointment.id)) return true;
  const phone = normalizePhone(client.phone);
  if (phone.length >= 10 && normalizePhone(appointment.phone) === phone) {
    return true;
  }
  const email = client.email.trim().toLowerCase();
  const apEmail = appointment.email?.trim().toLowerCase() ?? "";
  if (email && apEmail && email === apEmail) return true;
  return false;
}

export async function listClientAppointments(
  client: ClientAccount
): Promise<Appointment[]> {
  const { appointments } = await readSchedulingData();
  const now = Date.now();

  return appointments
    .filter(
      (ap) => ap.status === "confirmed" && clientOwnsAppointment(client, ap)
    )
    .sort((a, b) => {
      const aStart = a.startAt ?? "";
      const bStart = b.startAt ?? "";
      const aUpcoming = aStart ? new Date(aStart).getTime() >= now : false;
      const bUpcoming = bStart ? new Date(bStart).getTime() >= now : false;
      if (aUpcoming && bUpcoming) return aStart.localeCompare(bStart);
      if (aUpcoming) return -1;
      if (bUpcoming) return 1;
      return bStart.localeCompare(aStart);
    });
}

export async function getClientAppointment(
  client: ClientAccount,
  appointmentId: string
): Promise<Appointment | null> {
  const { appointments } = await readSchedulingData();
  const appointment = appointments.find((ap) => ap.id === appointmentId);
  if (!appointment || !clientOwnsAppointment(client, appointment)) {
    return null;
  }
  return appointment;
}

export function mergeAppointmentIds(
  existing: string[] | undefined,
  appointmentId: string
): string[] {
  const ids = existing ?? [];
  if (ids.includes(appointmentId)) return ids;
  return [...ids, appointmentId];
}
