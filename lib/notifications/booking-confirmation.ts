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

  const result = await sendSms(appointment.phone, body);
  if (result.ok) {
    try {
      const { ensureCrmSeeded } = await import("@/lib/crm/seed");
      const { findContactByPhone, appendInteraction, newInteractionId } = await import(
        "@/lib/crm/store"
      );
      await ensureCrmSeeded();
      const contact = await findContactByPhone(appointment.phone);
      if (contact) {
        await appendInteraction({
          id: newInteractionId(),
          contactId: contact.id,
          phone: contact.phone,
          channel: "sms",
          direction: "outbound",
          body,
          summary: "Booking confirmation SMS",
          messageStatus: "sent",
          twilioSid: result.sid,
          actor: "system",
          createdAt: new Date().toISOString(),
          metadata: { appointmentId: appointment.id, kind: "booking_confirmation" },
        });
      }
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
