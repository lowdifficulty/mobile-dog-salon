import "server-only";

import { normalizePhone } from "@/lib/leads/normalize";
import { getClientSession } from "@/lib/payments/auth";

export function isValidLookupPhone(phone: string): boolean {
  return normalizePhone(phone).length >= 10;
}

export async function setMyAppointmentPhone(phone: string): Promise<string> {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10) {
    throw new Error("Invalid phone");
  }
  const session = await getClientSession();
  session.myAppointmentPhone = normalized;
  await session.save();
  return normalized;
}

export async function getMyAppointmentPhone(): Promise<string | null> {
  const session = await getClientSession();
  const phone = session.myAppointmentPhone;
  if (!phone || normalizePhone(phone).length < 10) return null;
  return normalizePhone(phone);
}

export async function requireMyAppointmentPhone(): Promise<string> {
  const phone = await getMyAppointmentPhone();
  if (!phone) throw new Error("Unauthorized");
  return phone;
}

export async function clearMyAppointmentPhone(): Promise<void> {
  const session = await getClientSession();
  delete session.myAppointmentPhone;
  await session.save();
}
