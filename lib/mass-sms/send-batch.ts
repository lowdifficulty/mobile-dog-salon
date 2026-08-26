import "server-only";
import { sendSms } from "@/lib/notifications/twilio";
import { readSchedulingData } from "@/lib/scheduling/store";
import { readLeadsData } from "@/lib/leads/store";
import { appendMassSmsSent } from "./store";
import { listMassSmsEligibleContacts } from "./eligibility";
import { massLeadNurtureSmsBody, massRebookSmsBody, massCancelledSmsBody } from "./message";
import type { MassSmsCampaignKind, MassSmsSentRecord } from "./types";

const DEFAULT_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 5;
const DELAY_BETWEEN_MS = 2500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendMassSmsBatch(options?: {
  kind?: MassSmsCampaignKind;
  batchSize?: number;
  actorEmail?: string;
}): Promise<{
  sent: MassSmsSentRecord[];
  failed: MassSmsSentRecord[];
  remaining: number;
}> {
  const kind = options?.kind ?? "rebook";
  const batchSize = Math.min(
    MAX_BATCH_SIZE,
    Math.max(1, options?.batchSize ?? DEFAULT_BATCH_SIZE)
  );

  const eligible = await listMassSmsEligibleContacts(kind);
  const pending = eligible.filter((c) => !c.sentThisWeek).slice(0, batchSize);

  if (pending.length === 0) {
    const all = await listMassSmsEligibleContacts(kind);
    return { sent: [], failed: [], remaining: all.filter((c) => !c.sentThisWeek).length };
  }

  const scheduling = await readSchedulingData();
  const { leads } = await readLeadsData();
  const sent: MassSmsSentRecord[] = [];
  const failed: MassSmsSentRecord[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < pending.length; i++) {
    const contact = pending[i];

    if (kind === "rebook") {
      const appointment = scheduling.appointments.find(
        (a) => a.id === contact.lastVisitAppointmentId
      );

      if (!appointment) {
        failed.push({
          phoneKey: contact.phoneKey,
          appointmentId: contact.lastVisitAppointmentId,
          firstName: contact.firstName,
          petName: contact.petName ?? "",
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
        petName: contact.petName ?? appointment.petName,
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
    } else if (kind === "cancelled") {
      const appointment = scheduling.appointments.find(
        (a) => a.id === contact.cancelledAppointmentId
      );

      if (!appointment) {
        failed.push({
          phoneKey: contact.phoneKey,
          appointmentId: contact.cancelledAppointmentId,
          firstName: contact.firstName,
          petName: contact.petName ?? "",
          sentAt: now,
          error: "Appointment not found",
        });
        continue;
      }

      const body = massCancelledSmsBody(appointment);
      const result = await sendSms(appointment.phone, body);

      const record: MassSmsSentRecord = {
        phoneKey: contact.phoneKey,
        appointmentId: appointment.id,
        firstName: contact.firstName,
        petName: contact.petName ?? appointment.petName,
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
            summary: "Mass cancelled win-back SMS",
            twilioSid: result.sid,
            metadata: { appointmentId: appointment.id, kind: "mass_cancelled_sms" },
          });
        } catch (err) {
          console.error("CRM log for cancelled mass SMS failed:", err);
        }
      } else {
        failed.push(record);
      }
    } else {
      const lead = leads.find((l) => l.id === contact.leadId);
      if (!lead) {
        failed.push({
          phoneKey: contact.phoneKey,
          leadId: contact.leadId,
          firstName: contact.firstName,
          petName: contact.petName ?? "",
          sentAt: now,
          error: "Lead not found",
        });
        continue;
      }

      const body = massLeadNurtureSmsBody({
        firstName: lead.firstName ?? contact.firstName,
        petName: contact.petName ?? lead.petName,
      });
      const result = await sendSms(lead.phone, body);

      const record: MassSmsSentRecord = {
        phoneKey: contact.phoneKey,
        leadId: lead.id,
        firstName: contact.firstName,
        petName: contact.petName ?? "",
        sentAt: now,
        twilioSid: result.sid,
        error: result.ok ? undefined : result.error,
      };

      if (result.ok) {
        sent.push(record);
        try {
          const { ensureContactForPhone } = await import("@/lib/crm/messaging");
          const { appendInteraction, newInteractionId } = await import("@/lib/crm/store");
          const crmContact = await ensureContactForPhone(lead.phone);
          await appendInteraction({
            id: newInteractionId(),
            contactId: crmContact.id,
            channel: "sms",
            direction: "outbound",
            body,
            summary: "Mass lead nurture SMS",
            actor: "system",
            staffName: options?.actorEmail,
            phone: crmContact.phone,
            messageStatus: "sent",
            createdAt: now,
            metadata: { leadId: lead.id, kind: "mass_lead_nurture_sms" },
          });
        } catch (err) {
          console.error("CRM log for lead nurture SMS failed:", err);
        }
      } else {
        failed.push(record);
      }
    }

    if (i < pending.length - 1) {
      await sleep(DELAY_BETWEEN_MS);
    }
  }

  if (sent.length > 0) {
    await appendMassSmsSent(kind, sent);
  }

  const remaining = (await listMassSmsEligibleContacts(kind)).filter((c) => !c.sentThisWeek)
    .length;

  return { sent, failed, remaining };
}
