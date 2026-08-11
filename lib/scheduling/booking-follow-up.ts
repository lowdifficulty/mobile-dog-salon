import "server-only";

import { upsertLead } from "@/lib/leads/store";
import { leadFieldsFromAppointment } from "@/lib/leads/appointment-fields";
import { getAppointmentPets } from "@/lib/booking/pets";
import { sendCalendarInvites } from "@/lib/scheduling/calendar";
import { sendStaffBookingNotifications } from "@/lib/notifications/staff-booking-notify";
import { readLeadsData, writeLeadsData } from "@/lib/leads/store";
import { normalizePhone } from "@/lib/leads/normalize";
import type { Appointment } from "@/lib/scheduling/types";

/** Lead sync, calendar invites, confirmations, reminders, and CRM after a new booking. */
export async function runBookingFollowUp(
  appointment: Appointment,
  source: "booking" | "staff",
  options?: { skipStaffNotifications?: boolean }
): Promise<void> {
  try {
    await upsertLead({
      funnelStep: "scheduled",
      phone: appointment.phone,
      email: appointment.email,
      firstName: appointment.firstName,
      lastName: appointment.lastName,
      petName: appointment.petName,
      petSize: appointment.petSize,
      pets: getAppointmentPets(appointment),
      service: appointment.service,
      address: appointment.address,
      city: appointment.city,
      zipCode: appointment.zipCode,
      smsOptIn: appointment.smsOptIn,
      discountActive: appointment.smsOptIn,
      appointmentId: appointment.id,
      scheduledAt: appointment.createdAt,
      followUpMode: "fu",
      ...leadFieldsFromAppointment(appointment),
      source: source === "staff" ? "contact" : "booking",
    });
  } catch (err) {
    console.error("Lead sync failed:", err);
  }

  try {
    const data = await readLeadsData();
    const normalized = normalizePhone(appointment.phone);
    const lead = data.leads.find((l) => normalizePhone(l.phone) === normalized);
    if (lead) {
      lead.followUpMode = "fu";
      lead.appointmentStartAt = appointment.startAt;
      lead.updatedAt = new Date().toISOString();
      await writeLeadsData(data);
    }
  } catch (err) {
    console.error("Lead follow-up flag failed:", err);
  }

  if (options?.skipStaffNotifications) {
    // Batch staff bookings: still confirm the customer, skip duplicate staff noise.
  } else {
    try {
      await sendCalendarInvites(appointment);
    } catch (err) {
      console.error("Calendar invite failed:", err);
    }

    try {
      await sendStaffBookingNotifications(appointment);
    } catch (err) {
      console.error("Staff booking notifications failed:", err);
    }

    try {
      const { sendBookingToGoHighLevel } = await import("@/lib/gohighlevel");
      const ghlResult = await sendBookingToGoHighLevel(appointment);
      if (ghlResult.errors.length) {
        console.warn("GoHighLevel partial sync:", ghlResult.errors.join("; "));
      }
    } catch (err) {
      console.error("GoHighLevel sync failed:", err);
    }
  }

  try {
    const { sendBookingConfirmations } = await import("@/lib/notifications/booking-confirmation");
    await sendBookingConfirmations(appointment);
  } catch (err) {
    console.error("Customer confirmation notifications failed:", err);
  }

  try {
    const { ensureBookingConfirmationInCrm } = await import("@/lib/crm/messaging");
    await ensureBookingConfirmationInCrm(appointment);
  } catch (err) {
    console.error("CRM confirmation SMS log failed:", err);
  }

  try {
    const { scheduleAppointmentReminders } = await import("@/lib/notifications/schedule-reminders");
    const scheduled = await scheduleAppointmentReminders(appointment);
    if (scheduled.scheduled.length) {
      console.log("Scheduled reminders:", scheduled.scheduled.join(", "), appointment.id);
    }
    if (scheduled.skipped.length) {
      console.log("Reminder schedule notes:", scheduled.skipped.join("; "));
    }
  } catch (err) {
    console.error("QStash reminder scheduling failed:", err);
  }
}
