import "server-only";
import { sendCustomerConfirmationWithTemplate } from "./staff-booking-notify";
import { sendSms } from "./twilio";
import { appointmentSummaryLines } from "./appointment-format";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { getAppointmentPetLabel } from "@/lib/booking/pets";
import type { Appointment } from "@/lib/scheduling/types";

export async function sendCustomerConfirmationEmail(
  appointment: Appointment
): Promise<boolean> {
  return sendCustomerConfirmationWithTemplate(appointment);
}

export function bookingConfirmationSmsBody(appointment: Appointment): string {
  const { groomerName, serviceLabel, when } = appointmentSummaryLines(appointment);
  const petLabel = getAppointmentPetLabel(appointment);

  return [
    `Mobile Dog Salon: You're booked!`,
    `${petLabel} — ${serviceLabel}`,
    `${when.smsWhen}`,
    `Groomer: ${groomerName}`,
    formatAppointmentAddress(appointment),
    `Reply STOP to opt out. HELP for help.`,
  ].join("\n");
}

export async function sendCustomerConfirmationSms(
  appointment: Appointment
): Promise<boolean> {
  if (!appointment.smsOptIn || !appointment.phone.trim()) {
    return false;
  }

  const body = bookingConfirmationSmsBody(appointment);

  const result = await sendSms(appointment.phone, body);
  if (result.ok) {
    try {
      const { recordSystemOutboundSms } = await import("@/lib/crm/messaging");
      await recordSystemOutboundSms({
        appointment,
        body,
        summary: "Booking confirmation SMS",
        twilioSid: result.sid,
        metadata: { appointmentId: appointment.id, kind: "booking_confirmation" },
      });
    } catch (err) {
      console.error("CRM log for confirmation SMS failed:", err);
    }
  }
  return result.ok;
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
