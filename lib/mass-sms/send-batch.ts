import "server-only";
import { sendSms } from "@/lib/notifications/twilio";
import { readSchedulingData } from "@/lib/scheduling/store";
import { appendMassSmsSent } from "./store";
import { listMassSmsEligibleContacts } from "./eligibility";
import { massRebookSmsBody } from "./message";
import type { MassSmsSentRecord } from "./types";

const DEFAULT_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 5;
const DELAY_BETWEEN_MS = 2500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendMassSmsBatch(options?: {
  batchSize?: number;
  actorEmail?: string;
}): Promise<{
  sent: MassSmsSentRecord[];
  failed: MassSmsSentRecord[];
  remaining: number;
}> {
  const batchSize = Math.min(
    MAX_BATCH_SIZE,
    Math.max(1, options?.batchSize ?? DEFAULT_BATCH_SIZE)
  );

  const eligible = await listMassSmsEligibleContacts();
  const pending = eligible.filter((c) => !c.sentThisWeek).slice(0, batchSize);

  if (pending.length === 0) {
    const all = await listMassSmsEligibleContacts();
    return { sent: [], failed: [], remaining: all.filter((c) => !c.sentThisWeek).length };
  }

  const scheduling = await readSchedulingData();
  const sent: MassSmsSentRecord[] = [];
  const failed: MassSmsSentRecord[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < pending.length; i++) {
    const contact = pending[i];
    const appointment = scheduling.appointments.find(
      (a) => a.id === contact.lastVisitAppointmentId
    );

    if (!appointment) {
      failed.push({
        phoneKey: contact.phoneKey,
        appointmentId: contact.lastVisitAppointmentId,
        firstName: contact.firstName,
        petName: contact.petName,
        sentAt: now,
        error: "Appointment not found",
      });
      continue;
    }

    const body = massRebookSmsBody(appointment);
    const result = await sendSms(appointment.phone, body);

    const record: MassSmsSentRecord = {
      phoneKey: contact.phoneKey,
      appointmentId: appointment.id,
      firstName: contact.firstName,
      petName: contact.petName,
      sentAt: now,
      twilioSid: result.sid,
      error: result.ok ? undefined : result.error,
    };

    if (result.ok) {
      sent.push(record);
      try {
        const { recordSystemOutboundSms } = await import("@/lib/crm/messaging");
        await recordSystemOutboundSms({
          appointment,
          body,
          summary: "Mass re-engagement SMS",
          twilioSid: result.sid,
          metadata: { appointmentId: appointment.id, kind: "mass_rebook_sms" },
        });
      } catch (err) {
        console.error("CRM log for mass SMS failed:", err);
      }
    } else {
      failed.push(record);
    }

    if (i < pending.length - 1) {
      await sleep(DELAY_BETWEEN_MS);
    }
  }

  if (sent.length > 0) {
    await appendMassSmsSent(sent);
  }

  const remaining = (await listMassSmsEligibleContacts()).filter((c) => !c.sentThisWeek).length;

  return { sent, failed, remaining };
}
