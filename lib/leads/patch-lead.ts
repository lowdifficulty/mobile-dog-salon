import "server-only";

import { normalizePhone } from "./normalize";
import { getLeadById, updateLeadFields } from "./store";
import { readSchedulingData, writeSchedulingData } from "@/lib/scheduling/store";
import type { Lead } from "./types";

export interface LeadDetailsPatch {
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  petName?: string;
  petSize?: string;
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

async function syncLeadToAppointment(lead: Lead, actor: string): Promise<void> {
  if (!lead.appointmentId) return;

  const data = await readSchedulingData();
  const appointment = data.appointments.find((a) => a.id === lead.appointmentId);
  if (!appointment || appointment.status === "cancelled") return;

  if (lead.phone) appointment.phone = lead.phone;
  if (lead.firstName) appointment.firstName = lead.firstName;
  if (lead.lastName) appointment.lastName = lead.lastName;
  if (lead.email) appointment.email = lead.email;
  if (lead.petName !== undefined) appointment.petName = lead.petName;
  if (lead.petSize) appointment.petSize = lead.petSize;
  if (lead.service) appointment.service = lead.service;
  if (lead.address) appointment.address = lead.address;
  if (lead.city) appointment.city = lead.city;
  if (lead.zipCode) appointment.zipCode = lead.zipCode;

  if (lead.pets?.length) {
    appointment.additionalPets = lead.pets.slice(1).map((pet) => ({
      petName: pet.petName,
      petSize: pet.petSize,
    }));
  }

  await writeSchedulingData(data, {
    action: "appointment_reschedule",
    actor,
    groomerId: appointment.groomerId,
  });
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

  const lead = await updateLeadFields(leadId, {
    ...normalizedPatch,
    fullName:
      normalizedPatch.firstName !== undefined || normalizedPatch.lastName !== undefined
        ? [normalizedPatch.firstName, normalizedPatch.lastName].filter(Boolean).join(" ")
        : undefined,
  });
  if (!lead) {
    return { ok: false, error: "Lead not found", status: 404 };
  }

  await syncLeadToAppointment(lead, actor);
  const refreshed = (await getLeadById(leadId)) ?? lead;

  return { ok: true, lead: refreshed };
}
