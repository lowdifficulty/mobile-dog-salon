import "server-only";

import { GROOMERS, groomerAcceptsBookings } from "@/lib/scheduling/groomers";
import { transferAppointmentToGroomer } from "@/lib/scheduling/appointment-actions";
import type { GroomerId } from "@/lib/scheduling/types";
import { updateLeadFields, getLeadById, getLeadByAppointmentId } from "@/lib/leads/store";
import { addLeadNote } from "@/lib/leads/store";
import {
  groomerDisplayName,
} from "@/lib/staff/transfers";
import type { StaffTransfer } from "@/lib/staff/types";

export async function revertDeclinedAppointmentTransfer(
  transfer: StaffTransfer
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (transfer.type !== "appointment" || !transfer.appointmentId || !transfer.fromGroomerId) {
    return { ok: false, error: "Cannot revert transfer" };
  }

  const result = await transferAppointmentToGroomer(
    transfer.appointmentId,
    transfer.fromGroomerId,
    `transfer-decline:${transfer.toGroomerId}`
  );
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}

export async function applyAcceptedTransfer(
  transfer: StaffTransfer
): Promise<{ ok: true } | { ok: false; error: string }> {
  const toName = groomerDisplayName(transfer.toGroomerId);

  if (transfer.type === "appointment" && transfer.appointmentId) {
    const result = await transferAppointmentToGroomer(
      transfer.appointmentId,
      transfer.toGroomerId,
      `transfer:${transfer.fromName}`
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const linkedLead = await getLeadByAppointmentId(transfer.appointmentId);
    if (linkedLead) {
      await updateLeadFields(linkedLead.id, {
        groomerId: transfer.toGroomerId,
        groomerName: toName,
      });
      await addLeadNote(
        linkedLead.id,
        `${transfer.fromName} transferred this appointment to ${toName}.`
      );
    }

    return { ok: true };
  }

  if (transfer.type === "lead" && transfer.leadId) {
    const lead = await getLeadById(transfer.leadId);
    if (!lead) {
      return { ok: false, error: "Lead not found" };
    }

    if (lead.appointmentId) {
      const result = await transferAppointmentToGroomer(
        lead.appointmentId,
        transfer.toGroomerId,
        `transfer:${transfer.fromName}`
      );
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
    }

    await updateLeadFields(lead.id, {
      groomerId: transfer.toGroomerId,
      groomerName: toName,
    });
    await addLeadNote(
      lead.id,
      `${transfer.fromName} transferred this lead to ${toName}.`
    );

    return { ok: true };
  }

  return { ok: false, error: "Invalid transfer" };
}

export function staffTransferTargets(
  currentGroomerId?: GroomerId
): { id: GroomerId; name: string }[] {
  return (Object.keys(GROOMERS) as GroomerId[])
    .filter((id) => id !== currentGroomerId && groomerAcceptsBookings(id))
    .map((id) => ({ id, name: GROOMERS[id].name }));
}
