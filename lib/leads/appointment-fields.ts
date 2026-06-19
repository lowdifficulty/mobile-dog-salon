import { GROOMERS } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";

export interface LeadAppointmentFields {
  appointmentStartAt: string;
  groomerId: GroomerId;
  groomerName: string;
}

export function leadFieldsFromAppointment(appointment: {
  startAt: string;
  groomerId: GroomerId;
}): LeadAppointmentFields {
  return {
    appointmentStartAt: appointment.startAt,
    groomerId: appointment.groomerId,
    groomerName: GROOMERS[appointment.groomerId].name,
  };
}

export function formatLeadAppointmentWhen(
  appointmentStartAt: string,
  groomerName?: string
): string {
  const when = new Date(appointmentStartAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
  return groomerName ? `${when} with ${groomerName}` : when;
}
