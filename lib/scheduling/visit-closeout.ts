import "server-only";

import {
  addNoteForAppointment,
  findLeadForAppointment,
  patchLeadForAppointmentByGroomer,
} from "@/lib/leads/appointment-lead";
import { clientPhotoUrl } from "@/lib/groomer/client-photos";
import { readLeadsData, writeLeadsData } from "@/lib/leads/store";
import type { ClientPhoto } from "@/lib/leads/types";
import { cancelAppointment } from "@/lib/scheduling/appointment-actions";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import type {
  Appointment,
  AppointmentPaidVia,
  GroomerId,
  VisitCloseStatus,
} from "@/lib/scheduling/types";
import { canGroomerCloseVisit } from "@/lib/scheduling/visit-closeout-shared";

export type AppointmentActionResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; error: string; status: number };

export interface GroomerVisitCloseoutInput {
  outcome: VisitCloseStatus;
  firstName?: string;
  lastName?: string;
  petName?: string;
  groomNotes?: string;
  paidAmountCents?: number;
  paidVia?: AppointmentPaidVia;
}

const PAID_VIA_VALUES = new Set<AppointmentPaidVia>([
  "cash",
  "card",
  "venmo",
  "zelle",
  "check",
  "other",
]);

function validateCloseoutInput(
  input: GroomerVisitCloseoutInput
): { ok: true } | { ok: false; error: string } {
  if (input.outcome !== "complete" && input.outcome !== "cancelled") {
    return { ok: false, error: "Outcome must be complete or cancelled." };
  }

  if (
    input.paidAmountCents !== undefined &&
    (!Number.isInteger(input.paidAmountCents) || input.paidAmountCents < 0)
  ) {
    return { ok: false, error: "Paid amount must be a non-negative whole number of cents." };
  }

  if (input.paidVia !== undefined && !PAID_VIA_VALUES.has(input.paidVia)) {
    return { ok: false, error: "Invalid payment method." };
  }

  return { ok: true };
}

function applyCloseoutFields(
  appointment: Appointment,
  input: GroomerVisitCloseoutInput,
  actor: string
): void {
  if (input.firstName !== undefined) {
    appointment.firstName = input.firstName.trim();
  }
  if (input.lastName !== undefined) {
    appointment.lastName = input.lastName.trim();
  }
  if (input.petName !== undefined) {
    appointment.petName = input.petName.trim();
  }

  const groomNotes = input.groomNotes?.trim();
  if (groomNotes) {
    appointment.groomNotes = groomNotes;
  }

  if (input.paidAmountCents !== undefined) {
    appointment.paidAmountCents = input.paidAmountCents;
  }
  if (input.paidVia !== undefined) {
    appointment.paidVia = input.paidVia;
  }

  appointment.visitCloseStatus = input.outcome;
  appointment.visitClosedAt = new Date().toISOString();
  appointment.visitClosedBy = actor;
}

async function syncLeadAfterCloseout(
  appointment: Appointment,
  input: GroomerVisitCloseoutInput,
  actor: string
): Promise<void> {
  const scheduling = await readSchedulingData();
  const fresh = scheduling.appointments.find((a) => a.id === appointment.id) ?? appointment;

  let lead = await findLeadForAppointment(fresh);
  if (!lead) {
    await patchLeadForAppointmentByGroomer(
      fresh.id,
      {
        firstName: input.firstName ?? fresh.firstName,
        lastName: input.lastName ?? fresh.lastName,
        petName: input.petName ?? fresh.petName,
      },
      fresh.groomerId,
      actor
    );
    lead = await findLeadForAppointment(fresh);
  }

  if (!lead) return;

  const now = new Date().toISOString();
  const data = await readLeadsData();
  const index = data.leads.findIndex((l) => l.id === lead!.id);
  if (index < 0) return;

  const current = data.leads[index];
  const next = { ...current, updatedAt: now };

  if (input.outcome === "complete") {
    next.funnelStep = "appointment_completed";
    next.lastAppointmentAt = fresh.startAt;
    next.visitOutcome = "complete";
    next.visitOutcomeManual = true;
    next.appointmentId = fresh.id;
  } else {
    next.visitOutcome = "incomplete";
    next.visitOutcomeManual = true;
  }

  data.leads[index] = next;
  await writeLeadsData(data);

  const notes = input.groomNotes?.trim();
  if (notes) {
    await addNoteForAppointment(fresh.id, notes, fresh.groomerId);
  }
}

export async function getGroomerVisitCloseout(
  appointmentId: string,
  groomerId: GroomerId
): Promise<
  | {
      ok: true;
      appointment: Appointment;
      leadId: string | null;
      photos: (ClientPhoto & { url: string })[];
    }
  | { ok: false; error: string; status: number }
> {
  const data = await readSchedulingData();
  const appointment = data.appointments.find((a) => a.id === appointmentId);
  if (!appointment) {
    return { ok: false, error: "Appointment not found", status: 404 };
  }
  if (appointment.groomerId !== groomerId) {
    return { ok: false, error: "Not your appointment", status: 403 };
  }
  if (!canGroomerCloseVisit(appointment, groomerId)) {
    return { ok: false, error: "Visit is not ready for closeout yet.", status: 400 };
  }

  const lead = await findLeadForAppointment(appointment);
  const photos = (lead?.photos ?? []).map((photo) => ({
    ...photo,
    url: clientPhotoUrl(photo.id),
  }));

  const forAppointment = photos.filter(
    (photo) => !photo.appointmentId || photo.appointmentId === appointmentId
  );

  return {
    ok: true,
    appointment,
    leadId: lead?.id ?? null,
    photos: forAppointment,
  };
}

export async function closeGroomerVisit(
  appointmentId: string,
  groomerId: GroomerId,
  actor: string,
  input: GroomerVisitCloseoutInput
): Promise<AppointmentActionResult> {
  const validation = validateCloseoutInput(input);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const data = await readSchedulingData();
  const appointment = data.appointments.find((a) => a.id === appointmentId);
  if (!appointment) {
    return { ok: false, error: "Appointment not found", status: 404 };
  }
  if (appointment.groomerId !== groomerId) {
    return { ok: false, error: "Not your appointment", status: 403 };
  }
  if (!canGroomerCloseVisit(appointment, groomerId)) {
    return { ok: false, error: "Visit is not ready for closeout yet.", status: 400 };
  }

  if (input.outcome === "cancelled" && appointment.status === "confirmed") {
    const cancelResult = await cancelAppointment(appointmentId, actor, {
      groomerId,
      cancelledVia: "staff",
    });
    if (!cancelResult.ok) {
      return cancelResult;
    }

    const afterCancel = await readSchedulingData();
    const saved = afterCancel.appointments.find((a) => a.id === appointmentId);
    if (!saved) {
      return { ok: false, error: "Appointment not found", status: 404 };
    }

    applyCloseoutFields(saved, input, actor);

    await writeSchedulingData(afterCancel, {
      action: "appointment_reschedule",
      actor,
      groomerId,
    });
  } else {
    applyCloseoutFields(appointment, input, actor);
    await writeSchedulingData(data, {
      action: "appointment_reschedule",
      actor,
      groomerId,
    });
  }

  await patchLeadForAppointmentByGroomer(
    appointmentId,
    {
      firstName: input.firstName,
      lastName: input.lastName,
      petName: input.petName,
      visitOutcome: input.outcome === "complete" ? "complete" : "incomplete",
    },
    groomerId,
    actor
  );

  const scheduling = await readSchedulingData();
  const updated =
    scheduling.appointments.find((a) => a.id === appointmentId) ?? appointment;

  await syncLeadAfterCloseout(updated, input, actor);

  const finalData = await readSchedulingData();
  const finalAppointment =
    finalData.appointments.find((a) => a.id === appointmentId) ?? updated;

  return { ok: true, appointment: finalAppointment };
}
