import "server-only";

import {
  getClientServiceAddress,
  parseClientAddressMessage,
  saveClientServiceAddress,
  type ClientServiceAddress,
} from "@/lib/client/licky-address";
import type { LickyActionContext } from "@/lib/client/licky-context";
import { listClientAppointments } from "@/lib/client/appointments";
import { updateClient } from "@/lib/payments/store";
import { normalizePhone, phoneLast10 } from "@/lib/leads/normalize";

export function getPendingLickyBooking(ctx: LickyActionContext) {
  return ctx.account?.pendingLickyBooking ?? ctx.guest?.pendingLickyBooking;
}

export async function getServiceAddressFromCtx(
  ctx: LickyActionContext
): Promise<ClientServiceAddress | null> {
  if (ctx.account) {
    const appointments = await listClientAppointments(ctx.account).catch(() => []);
    return getClientServiceAddress(ctx.account, appointments);
  }
  const saved = ctx.guest?.serviceAddress;
  if (!saved?.address?.trim() || !saved.city?.trim() || !saved.zipCode?.trim()) {
    return null;
  }
  const parsed = parseClientAddressMessage(
    `${saved.address}, ${saved.city}, ${saved.zipCode}`
  );
  return parsed;
}

export async function saveServiceAddressToCtx(
  ctx: LickyActionContext,
  address: ClientServiceAddress
): Promise<void> {
  if (ctx.account) {
    await saveClientServiceAddress(ctx.account.id, address);
    return;
  }
  await ctx.saveGuest?.({ serviceAddress: address });
}

export async function savePendingBookingToCtx(
  ctx: LickyActionContext,
  pending: {
    slotKey: string;
    service: string;
    fromFallback?: boolean;
    holdId?: string;
  }
): Promise<void> {
  if (ctx.account) {
    await updateClient(ctx.account.id, { pendingLickyBooking: pending });
    return;
  }
  await ctx.saveGuest?.({ pendingLickyBooking: pending });
}

export async function clearPendingBooking(ctx: LickyActionContext): Promise<void> {
  if (ctx.account) {
    await updateClient(ctx.account.id, { pendingLickyBooking: null });
    return;
  }
  await ctx.saveGuest?.({ pendingLickyBooking: null });
}

export function hasValidContact(ctx: LickyActionContext): boolean {
  const phone = getPhoneFromCtx(ctx);
  return phone.replace(/\D/g, "").length >= 10;
}

export function getPhoneFromCtx(ctx: LickyActionContext): string {
  return (
    ctx.account?.phone?.trim() ||
    ctx.callerPhone?.trim() ||
    ctx.guest?.phone?.trim() ||
    ""
  );
}

export function getNameFromCtx(ctx: LickyActionContext): {
  firstName: string;
  lastName: string;
} {
  if (ctx.account) {
    return {
      firstName: ctx.account.firstName?.trim() || "Guest",
      lastName: ctx.account.lastName?.trim() || "",
    };
  }
  return {
    firstName: ctx.guest?.firstName?.trim() || "Guest",
    lastName: ctx.guest?.lastName?.trim() || "",
  };
}

export function getPetFromCtx(ctx: LickyActionContext): {
  petName: string;
  petSize: string;
} {
  const pet = ctx.account?.petProfile?.pets?.[0];
  return {
    petName: pet?.petName || ctx.guest?.petName || "",
    petSize: pet?.petSize || ctx.guest?.petSize || "medium",
  };
}

const PHONE_IN_TEXT =
  /(?:\+?1[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/;

const NAME_PREFIX =
  /^(hi|hello|hey|yes|ok|okay|sure|my name is|name is|i am|i'm|im|this is|it's|its|name|phone|number|cell|mobile)[:\s,]+/i;

const NAME_JUNK = /^(and|or|my|the|a|phone|number|is|it|please)$/i;

export function extractPhoneFromMessage(message: string): string | null {
  const match = message.match(PHONE_IN_TEXT);
  if (match) {
    const digits = phoneLast10(match[0]);
    if (digits.length === 10) return digits;
  }
  const all = phoneLast10(message);
  return all.length === 10 ? all : null;
}

export function parseContactMessage(message: string): {
  firstName: string;
  lastName: string;
  phone: string;
} | null {
  const trimmed = message.trim();
  const phone = extractPhoneFromMessage(trimmed);
  if (!phone) return null;

  let withoutPhone = trimmed
    .replace(PHONE_IN_TEXT, " ")
    .replace(/[+,()#]/g, " ")
    .replace(/[-–—.:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  while (NAME_PREFIX.test(withoutPhone)) {
    withoutPhone = withoutPhone.replace(NAME_PREFIX, "").trim();
  }

  const parts = withoutPhone.split(/\s+/).filter((p) => p && !NAME_JUNK.test(p));
  const firstName = parts[0] || "Guest";
  const lastName = parts.slice(1).join(" ");

  return {
    firstName,
    lastName,
    phone,
  };
}

export async function saveContactToCtx(
  ctx: LickyActionContext,
  contact: { firstName: string; lastName: string; phone: string }
): Promise<void> {
  if (ctx.account) return;
  const phone = normalizePhone(contact.phone);
  await ctx.saveGuest?.({
    firstName: contact.firstName,
    lastName: contact.lastName,
    phone,
  });
}
