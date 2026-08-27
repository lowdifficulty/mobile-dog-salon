import "server-only";

import { normalizePhone } from "@/lib/leads/normalize";
import { patchLeadDetails, validateLeadDetailsPatch } from "@/lib/leads/patch-lead";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import { findContactById, updateContactFields } from "./store";
import { crmPhoneDigits, crmPhoneE164, displayNameFromContact } from "./phone";
import { getCrmContactDetail } from "./service";
import type { CrmContactDetail, CrmPet } from "./types";

export interface CrmContactDetailsPatch {
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  pets?: { petName: string; petSize?: string; petBreed?: string }[];
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
}

function validateCrmContactPatch(
  patch: CrmContactDetailsPatch
): { ok: true } | { ok: false; error: string } {
  return validateLeadDetailsPatch({
    phone: patch.phone,
    email: patch.email,
    zipCode: patch.zipCode,
  });
}

async function syncContactToMatchingAppointments(
  contact: {
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    address?: string;
    city?: string;
    zipCode?: string;
    service?: string;
    pets: CrmPet[];
    appointmentIds: string[];
  },
  actor: string
): Promise<void> {
  const data = await readSchedulingData();
  const phone = normalizePhone(contact.phone);
  const matchIds = new Set(contact.appointmentIds);

  let changed = false;
  for (const appointment of data.appointments) {
    if (appointment.status === "cancelled") continue;
    const phoneMatch = phone.length >= 10 && normalizePhone(appointment.phone) === phone;
    if (!phoneMatch && !matchIds.has(appointment.id)) continue;

    appointment.phone = contact.phone;
    if (contact.firstName !== undefined) appointment.firstName = contact.firstName;
    if (contact.lastName !== undefined) appointment.lastName = contact.lastName;
    if (contact.email !== undefined) appointment.email = contact.email;
    if (contact.address !== undefined) appointment.address = contact.address;
    if (contact.city !== undefined) appointment.city = contact.city;
    if (contact.zipCode !== undefined) appointment.zipCode = contact.zipCode;
    if (contact.service) appointment.service = contact.service;

    if (contact.pets.length > 0) {
      appointment.petName = contact.pets[0].petName;
      appointment.petSize = contact.pets[0].petSize ?? "medium";
      appointment.additionalPets = contact.pets.slice(1).map((pet) => ({
        petName: pet.petName,
        petSize: pet.petSize ?? "medium",
      }));
    }

    changed = true;
  }

  if (changed) {
    await writeSchedulingData(data, {
      action: "appointment_reschedule",
      actor,
    });
  }
}

export async function patchCrmContactDetails(
  contactId: string,
  patch: CrmContactDetailsPatch,
  actor: string
): Promise<
  { ok: true; contact: CrmContactDetail } | { ok: false; error: string; status: number }
> {
  const validation = validateCrmContactPatch(patch);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const existing = await findContactById(contactId);
  if (!existing) {
    return { ok: false, error: "Contact not found", status: 404 };
  }

  const normalized: CrmContactDetailsPatch = { ...patch };

  if (patch.phone !== undefined) {
    normalized.phone = crmPhoneDigits(patch.phone);
    if (normalized.phone.length > 0 && normalized.phone.length < 10) {
      return { ok: false, error: "Please enter a valid 10-digit phone number.", status: 400 };
    }
  }
  if (patch.email !== undefined) {
    normalized.email = patch.email.trim();
  }
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    normalized.firstName = patch.firstName?.trim() ?? existing.firstName ?? "";
    normalized.lastName = patch.lastName?.trim() ?? existing.lastName ?? "";
  }
  if (patch.address !== undefined) normalized.address = patch.address.trim();
  if (patch.city !== undefined) normalized.city = patch.city.trim();
  if (patch.zipCode !== undefined) normalized.zipCode = patch.zipCode.trim();
  if (patch.service !== undefined) normalized.service = patch.service;

  let pets = existing.pets;
  if (patch.pets !== undefined) {
    pets = patch.pets
      .map((pet) => ({
        petName: pet.petName?.trim() ?? "",
        petSize: pet.petSize?.trim() || "medium",
        petBreed: pet.petBreed?.trim() || undefined,
      }))
      .filter((pet) => pet.petName || pet.petSize);
  }

  const firstName = normalized.firstName ?? existing.firstName;
  const lastName = normalized.lastName ?? existing.lastName;
  const phone = normalized.phone ?? existing.phone;
  const fullName = displayNameFromContact({
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" ") || existing.fullName,
    phone,
  });

  const updated = await updateContactFields(contactId, {
    phone,
    phoneE164: crmPhoneE164(phone) ?? existing.phoneE164,
    firstName,
    lastName,
    fullName,
    email: normalized.email ?? existing.email,
    address: normalized.address ?? existing.address,
    city: normalized.city ?? existing.city,
    zipCode: normalized.zipCode ?? existing.zipCode,
    pets,
    service: normalized.service ?? existing.service,
  });

  if (!updated) {
    return { ok: false, error: "Contact not found", status: 404 };
  }

  await syncContactToMatchingAppointments(updated, actor);

  if (existing.leadId) {
    await patchLeadDetails(
      existing.leadId,
      {
        phone: updated.phone,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        address: updated.address,
        city: updated.city,
        zipCode: updated.zipCode,
        service: updated.service,
        pets: updated.pets.map((p) => ({
          petName: p.petName,
          petSize: p.petSize ?? "medium",
        })),
      },
      actor
    );
  }

  const detail = await getCrmContactDetail(contactId);
  if (!detail) {
    return { ok: false, error: "Contact not found", status: 404 };
  }

  return { ok: true, contact: detail };
}
