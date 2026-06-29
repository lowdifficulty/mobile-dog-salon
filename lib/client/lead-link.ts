import "server-only";

import { findLeadForAppointment } from "@/lib/leads/appointment-lead";
import { upsertLead } from "@/lib/leads/store";
import { readSchedulingData } from "@/lib/scheduling/store";
import type { ClientAccount } from "@/lib/payments/types";
import type { Lead } from "@/lib/leads/types";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export async function ensureLeadForClientAccount(
  account: ClientAccount
): Promise<Lead> {
  const { appointments } = await readSchedulingData();
  const phone = normalizePhone(account.phone);

  const linked = appointments.find(
    (ap) =>
      ap.status === "confirmed" &&
      (account.appointmentIds?.includes(ap.id) ||
        (phone.length >= 10 && normalizePhone(ap.phone) === phone))
  );

  if (linked) {
    const existing = await findLeadForAppointment(linked);
    if (existing) return existing;
  }

  const ap = linked ?? appointments.find(
    (a) => phone.length >= 10 && normalizePhone(a.phone) === phone
  );

  if (ap) {
    return upsertLead({
      funnelStep: "scheduled",
      source: "booking",
      appointmentId: ap.id,
      appointmentStartAt: ap.startAt,
      groomerId: ap.groomerId,
      scheduledAt: ap.createdAt,
      phone: account.phone,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      petName: ap.petName,
      petSize: ap.petSize,
      service: ap.service,
      address: ap.address,
      city: ap.city,
      zipCode: ap.zipCode,
    });
  }

  return upsertLead({
    funnelStep: "scheduled",
    source: "booking",
    phone: account.phone,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    petName: account.petProfile?.pets?.[0]?.petName,
    petSize: account.petProfile?.pets?.[0]?.petSize,
  });
}
