import "server-only";

import { normalizePhone } from "./normalize";
import { getLeadById, updateLeadFields } from "./store";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import type { GroomerId } from "@/lib/scheduling/types";
import type { Lead } from "./types";

export interface LeadDetailsPatch {
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  petName?: string;
  petSize?: string;
  pets?: { petName: string; petSize: string }[];
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  followUpMode?: Lead["followUpMode"];
  visitOutcome?: Lead["visitOutcome"];
  listStatus?: Lead["listStatus"];
}

export function validateLeadDetailsPatch(
  patch: LeadDetailsPatch
): { ok: true } | { ok: false; error: string } {
  if (patch.phone !== undefined) {
    const digits = normalizePhone(patch.phone);
    if (digits.length > 0 && digits.length < 10) {
      return { ok: false, error: "Please enter a valid 10-digit phone number." };
    }
  }

  if (patch.zipCode !== undefined && patch.zipCode.trim()) {
    if (!/^\d{5}(-\d{4})?$/.test(patch.zipCode.trim())) {
      return { ok: false, error: "Please enter a valid ZIP code." };
    }
  }

  if (patch.email !== undefined && patch.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.email.trim())) {
      return { ok: false, error: "Please enter a valid email address." };
    }
  }

  return { ok: true };
}

async function syncLeadContactToMatchingAppointments(
  lead: Lead,
  actor: string
): Promise<void> {
  const data = await readSchedulingData();
  const phone = normalizePhone(lead.phone);
  const matchIds = new Set<string>();
  if (lead.appointmentId) matchIds.add(lead.appointmentId);

  let changed = false;
  for (const appointment of data.appointments) {
    if (appointment.status === "cancelled") continue;
    const phoneMatch = phone.length >= 10 && normalizePhone(appointment.phone) === phone;
    if (!phoneMatch && !matchIds.has(appointment.id)) continue;

    if (lead.phone) appointment.phone = lead.phone;
    if (lead.firstName !== undefined) appointment.firstName = lead.firstName;
    if (lead.lastName !== undefined) appointment.lastName = lead.lastName;
    if (lead.email !== undefined) appointment.email = lead.email;
    if (lead.address !== undefined) appointment.address = lead.address;
    if (lead.city !== undefined) appointment.city = lead.city;
    if (lead.zipCode !== undefined) appointment.zipCode = lead.zipCode;
    if (lead.service) appointment.service = lead.service;

    if (lead.pets?.length) {
      appointment.petName = lead.pets[0].petName;
      appointment.petSize = lead.pets[0].petSize;
      appointment.additionalPets = lead.pets.slice(1).map((pet) => ({
        petName: pet.petName,
        petSize: pet.petSize,
      }));
    } else if (lead.petName !== undefined || lead.petSize !== undefined) {
      if (lead.petName !== undefined) appointment.petName = lead.petName;
      if (lead.petSize !== undefined) appointment.petSize = lead.petSize;
    }

    changed = true;
  }

  if (changed) {
    const groomerId =
      lead.groomerId === "melanie" || lead.groomerId === "diamond"
        ? lead.groomerId
        : undefined;
    await writeSchedulingData(data, {
      action: "appointment_reschedule",
      actor,
      groomerId,
    });
  }
}

export async function patchLeadDetails(
  leadId: string,
  patch: LeadDetailsPatch,
  actor: string
): Promise<{ ok: true; lead: Lead } | { ok: false; error: string; status: number }> {
  const validation = validateLeadDetailsPatch(patch);
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 400 };
  }

  const normalizedPatch = { ...patch };
  if (patch.phone !== undefined) {
    normalizedPatch.phone = normalizePhone(patch.phone);
  }
  if (patch.email !== undefined) {
    normalizedPatch.email = patch.email.trim();
  }
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    const first = patch.firstName?.trim() ?? "";
    const last = patch.lastName?.trim() ?? "";
    normalizedPatch.firstName = first;
    normalizedPatch.lastName = last;
  }

  if (patch.pets !== undefined) {
    normalizedPatch.pets = patch.pets
      .map((pet) => ({
        petName: pet.petName?.trim() ?? "",
        petSize: pet.petSize?.trim() ?? "medium",
      }))
      .filter((pet) => pet.petName || pet.petSize);
    if (normalizedPatch.pets.length > 0) {
      normalizedPatch.petName = normalizedPatch.pets[0].petName;
      normalizedPatch.petSize = normalizedPatch.pets[0].petSize;
    }
  }

  const lead = await updateLeadFields(leadId, {
    ...normalizedPatch,
    pets: normalizedPatch.pets,
    fullName:
      normalizedPatch.firstName !== undefined || normalizedPatch.lastName !== undefined
        ? [normalizedPatch.firstName, normalizedPatch.lastName].filter(Boolean).join(" ")
        : undefined,
  });
  if (!lead) {
    return { ok: false, error: "Lead not found", status: 404 };
  }

  await syncLeadContactToMatchingAppointments(lead, actor);
  const refreshed = (await getLeadById(leadId)) ?? lead;

  return { ok: true, lead: refreshed };
}
