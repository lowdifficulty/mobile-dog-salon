import { formatPetNames, getAppointmentPets } from "@/lib/booking/pets";
import { formatPhoneDisplay } from "@/lib/leads/normalize";
import { getServiceLabel } from "@/lib/pricing";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import type { Appointment } from "@/lib/scheduling/types";

export default function AppointmentClientDetails({
  appointment,
  compact = false,
}: {
  appointment: Appointment;
  compact?: boolean;
}) {
  const pets = formatPetNames(getAppointmentPets(appointment));
  const name = `${appointment.firstName} ${appointment.lastName}`.trim() || "Client";
  const phone = appointment.phone?.trim()
    ? formatPhoneDisplay(appointment.phone)
    : "";
  const email = appointment.email?.trim() || "";
  const address = formatAppointmentAddress(appointment);
  const service = appointment.service ? getServiceLabel(appointment.service) : "";
  const textClass = compact ? "text-xs text-gray-600" : "text-sm text-gray-600";

  return (
    <div className={`${textClass} space-y-0.5 ${compact ? "mt-1" : "mt-1"}`}>
      <p>
        <strong>Client:</strong> {name}
      </p>
      {phone ? (
        <p>
          <strong>Phone:</strong> {phone}
        </p>
      ) : null}
      {email ? (
        <p>
          <strong>Email:</strong> {email}
        </p>
      ) : null}
      {address ? (
        <p>
          <strong>Address:</strong> {address}
        </p>
      ) : null}
      {pets ? (
        <p>
          <strong>Pets:</strong> {pets}
        </p>
      ) : null}
      {service ? (
        <p>
          <strong>Service:</strong> {service}
        </p>
      ) : null}
      {appointment.notes?.trim() ? (
        <p>
          <strong>Notes:</strong> {appointment.notes.trim()}
        </p>
      ) : null}
    </div>
  );
}
