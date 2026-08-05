import "server-only";
import { sendCustomerConfirmationWithTemplate } from "./staff-booking-notify";
import { sendBookingSms } from "./twilio";
import { appointmentSummaryLines } from "./appointment-format";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { getAppointmentPetLabel } from "@/lib/booking/pets";
import type { Appointment } from "@/lib/scheduling/types";

export async function sendCustomerConfirmationEmail(
  appointment: Appointment
): Promise<boolean> {
  return sendCustomerConfirmationWithTemplate(appointment);
}

export async function sendCustomerConfirmationSms(
  appointment: Appointment
): Promise<boolean> {
  if (!appointment.smsOptIn || !appointment.phone.trim()) {
    return false;
  }

  const { groomerName, serviceLabel, when } = appointmentSummaryLines(appointment);
  const petLabel = getAppointmentPetLabel(appointment);

  const body = [
    `Mobile Dog Salon: You're booked!`,
    `${petLabel} — ${serviceLabel}`,
    `${when.smsWhen}`,
    `Groomer: ${groomerName}`,
    formatAppointmentAddress(appointment),
    `Reply STOP to opt out. HELP for help.`,
  ].join("\n");

  return sendBookingSms(appointment.phone, body);
}

export async function sendBookingConfirmations(
  appointment: Appointment
): Promise<{ email: boolean; sms: boolean }> {
  const [email, sms] = await Promise.all([
    sendCustomerConfirmationEmail(appointment).catch((err) => {
      console.error("Customer confirmation email failed:", err);
      return false;
    }),
    sendCustomerConfirmationSms(appointment).catch((err) => {
      console.error("Customer confirmation SMS failed:", err);
      return false;
    }),
  ]);

  return { email, sms };
}
