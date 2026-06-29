import "server-only";

import type { ClientAccount } from "@/lib/payments/types";
import { updateClient } from "@/lib/payments/store";
import {
  isValidBookingContact,
  parseFullAddress,
} from "@/lib/scheduling/address";
import type { Appointment } from "@/lib/scheduling/types";

export interface ClientServiceAddress {
  address: string;
  city: string;
  zipCode: string;
}

export function getClientServiceAddress(
  account: ClientAccount,
  appointments: Pick<Appointment, "address" | "city" | "zipCode">[] = []
): ClientServiceAddress | null {
  const saved = account.serviceAddress;
  if (
    saved &&
    isValidBookingContact(saved.address, saved.city, saved.zipCode)
  ) {
    return {
      address: saved.address.trim(),
      city: saved.city.trim(),
      zipCode: saved.zipCode.trim(),
    };
  }

  const fromAppt = appointments.find((a) => a.address?.trim());
  if (
    fromAppt &&
    isValidBookingContact(
      fromAppt.address ?? "",
      fromAppt.city ?? "",
      fromAppt.zipCode ?? ""
    )
  ) {
    return {
      address: fromAppt.address.trim(),
      city: fromAppt.city.trim(),
      zipCode: fromAppt.zipCode.trim(),
    };
  }

  return null;
}

export function parseClientAddressMessage(message: string): ClientServiceAddress | null {
  const parsed = parseFullAddress(message);
  if (!isValidBookingContact(parsed.address, parsed.city, parsed.zipCode)) {
    return null;
  }
  return {
    address: parsed.address.trim(),
    city: parsed.city.trim(),
    zipCode: parsed.zipCode.trim(),
  };
}

export async function saveClientServiceAddress(
  accountId: string,
  address: ClientServiceAddress
): Promise<ClientAccount | null> {
  return updateClient(accountId, {
    serviceAddress: {
      address: address.address.trim(),
      city: address.city.trim(),
      zipCode: address.zipCode.trim(),
    },
  });
}
