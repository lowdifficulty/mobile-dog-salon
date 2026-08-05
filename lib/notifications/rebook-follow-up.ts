import "server-only";
import type { Appointment } from "@/lib/scheduling/types";
import { readLeadsData, writeLeadsData } from "@/lib/leads/store";
import { appointmentEmailVariables } from "./appointment-email-vars";
import { sendTemplatedEmail } from "./send-templated-email";

export async function sendRebook3wEmail(appointment: Appointment): Promise<boolean> {
  if (appointment.status !== "confirmed") return false;

  const vars = appointmentEmailVariables(appointment, { discountActive: true });
  vars.discountLine =
    "Your 50% phone discount is still active — book your next visit to keep it on your account.";

  const result = await sendTemplatedEmail({
    templateId: "rebook_3w",
    to: appointment.email,
    variables: vars,
    appointmentId: appointment.id,
  });

  if (result.ok) {
    try {
      const data = await readLeadsData();
      const phone = appointment.phone.replace(/\D/g, "");
      const lead = data.leads.find(
        (l) =>
          l.phone.replace(/\D/g, "") === phone ||
          l.appointmentId === appointment.id
      );
      if (lead) {
        lead.discountActive = true;
        lead.updatedAt = new Date().toISOString();
        await writeLeadsData(data);
      }
    } catch (err) {
      console.error("Lead discount flag update failed:", err);
    }
  }

  return result.ok;
}
