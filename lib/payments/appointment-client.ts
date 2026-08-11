import "server-only";

import { randomUUID } from "crypto";
import { mergeAppointmentIds } from "@/lib/client/appointments";
import { normalizePhone } from "@/lib/leads/normalize";
import { hashClientPassword } from "@/lib/payments/auth";
import {
  createClient,
  findClientById,
  findClientByEmail,
  findClientByPhone,
  updateClient,
} from "@/lib/payments/store";
import type { ClientAccount } from "@/lib/payments/types";
import type { Appointment } from "@/lib/scheduling/types";

function syntheticClientEmail(phone: string): string {
  const digits = normalizePhone(phone);
  return `pay+${digits}@clients.mobiledog-salon.com`;
}

async function resolveClientEmail(appointment: Appointment): Promise<string> {
  const fromAppointment = appointment.email?.trim().toLowerCase() ?? "";
  if (fromAppointment && !(await findClientByEmail(fromAppointment))) {
    return fromAppointment;
  }
  const synthetic = syntheticClientEmail(appointment.phone);
  if (!(await findClientByEmail(synthetic))) return synthetic;
  return `pay+${randomUUID().slice(0, 8)}+${normalizePhone(appointment.phone)}@clients.mobiledog-salon.com`;
}

/** Find or create a portal/payment client linked to the appointment phone. */
export async function ensureClientForAppointment(
  appointment: Appointment
): Promise<ClientAccount> {
  const phone = appointment.phone?.trim() ?? "";
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 10) {
    throw new Error("Appointment phone number is missing or invalid.");
  }

  let account =
    (await findClientByPhone(phone)) ??
    (appointment.email?.trim()
      ? await findClientByEmail(appointment.email.trim())
      : null);

  if (account) {
    let linked = account;
    const appointmentIds = mergeAppointmentIds(account.appointmentIds, appointment.id);
    if (appointmentIds !== account.appointmentIds) {
      linked = (await updateClient(account.id, { appointmentIds })) ?? account;
    }

    const { isPaymentsConfigured, ensurePaymentCustomer } = await import(
      "@/lib/payments/gateway"
    );
    if (isPaymentsConfigured()) {
      await ensurePaymentCustomer(linked);
      linked = (await findClientById(linked.id)) ?? linked;
    }

    return linked;
  }

  const email = await resolveClientEmail(appointment);
  const { createPaymentCustomerOnRegister, isPaymentsConfigured } = await import(
    "@/lib/payments/gateway"
  );

  let squareCustomerId = "";
  let stripeCustomerId = "";
  if (isPaymentsConfigured()) {
    const ids = await createPaymentCustomerOnRegister({
      email,
      firstName: appointment.firstName.trim(),
      lastName: appointment.lastName.trim(),
      phone,
    });
    squareCustomerId = ids.squareCustomerId ?? "";
    stripeCustomerId = ids.stripeCustomerId ?? "";
  }

  const newAccount: ClientAccount = {
    id: randomUUID(),
    email,
    passwordHash: await hashClientPassword(randomUUID()),
    firstName: appointment.firstName.trim(),
    lastName: appointment.lastName.trim(),
    phone,
    squareCustomerId,
    stripeCustomerId,
    createdAt: new Date().toISOString(),
    registrationComplete: false,
    appointmentIds: [appointment.id],
    petProfile: { pets: [] },
  };

  await createClient(newAccount);
  return newAccount;
}

export function formatAppointmentPaymentNote(input: {
  appointment: Appointment;
  serviceDollars: number;
  tipDollars: number;
}): string {
  const { appointment, serviceDollars, tipDollars } = input;
  const when = new Date(appointment.startAt).toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
  });
  const tipPart = tipDollars > 0 ? ` · tip $${tipDollars.toFixed(2)}` : "";
  return `Appt ${appointment.id.slice(0, 8)} · ${appointment.petName || "Pet"} · ${when} · $${serviceDollars.toFixed(2)}${tipPart}`;
}
