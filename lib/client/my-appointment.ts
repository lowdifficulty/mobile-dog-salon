import "server-only";

import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { normalizePhone } from "@/lib/leads/normalize";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { readSchedulingData } from "@/lib/scheduling/store";
import type { Appointment } from "@/lib/scheduling/types";

export interface PublicAppointmentSummary {
  id: string;
  startAt: string;
  groomerId: string;
  groomerName: string;
  service: string;
  petName: string;
  petSize: string;
  status: string;
  address: string;
  city: string;
  zipCode: string;
  isUpcoming: boolean;
  quotedPrice: number | null;
}

export function phoneOwnsAppointment(phone: string, appointment: Appointment): boolean {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) return false;
  return normalizePhone(appointment.phone) === normalized;
}

export function serializePublicAppointment(
  appointment: Appointment,
  now = Date.now()
): PublicAppointmentSummary {
  return {
    id: appointment.id,
    startAt: appointment.startAt,
    groomerId: appointment.groomerId,
    groomerName: GROOMERS[appointment.groomerId]?.name ?? appointment.groomerId,
    service: appointment.service,
    petName: appointment.petName,
    petSize: appointment.petSize,
    status: appointment.status,
    address: appointment.address,
    city: appointment.city,
    zipCode: appointment.zipCode,
    isUpcoming: new Date(appointment.startAt).getTime() >= now,
    quotedPrice: getAppointmentBookedPrice(appointment),
  };
}

export async function listAppointmentsByPhone(
  phone: string
): Promise<PublicAppointmentSummary[]> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) return [];

  const { appointments } = await readSchedulingData();
  const now = Date.now();

  return appointments
    .filter(
      (appointment) =>
        appointment.status === "confirmed" && phoneOwnsAppointment(normalized, appointment)
    )
    .sort((a, b) => {
      const aUpcoming = new Date(a.startAt).getTime() >= now;
      const bUpcoming = new Date(b.startAt).getTime() >= now;
      if (aUpcoming && bUpcoming) return a.startAt.localeCompare(b.startAt);
      if (aUpcoming) return -1;
      if (bUpcoming) return 1;
      return b.startAt.localeCompare(a.startAt);
    })
    .map((appointment) => serializePublicAppointment(appointment, now));
}

export async function getAppointmentByPhone(
  phone: string,
  appointmentId: string
): Promise<Appointment | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) return null;

  const { appointments } = await readSchedulingData();
  const appointment = appointments.find((item) => item.id === appointmentId);
  if (!appointment || !phoneOwnsAppointment(normalized, appointment)) {
    return null;
  }
  return appointment;
}
