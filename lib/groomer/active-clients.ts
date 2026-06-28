import "server-only";

import { getAppointmentPets } from "@/lib/booking/pets";
import { normalizePhone } from "@/lib/leads/normalize";
import { readLeadsData } from "@/lib/leads/store";
import type { Lead, LeadNote } from "@/lib/leads/types";
import { readSchedulingData } from "@/lib/scheduling/store";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

export interface GroomerClientAppointment {
  id: string;
  startAt: string;
  service: string;
  petName: string;
  petSize: string;
  isUpcoming: boolean;
}

export interface GroomerClientRecord {
  key: string;
  leadId: string | null;
  anchorAppointmentId: string;
  firstName: string;
  lastName: string;
  phone: string;
  pets: { petName: string; petSize: string }[];
  notes: LeadNote[];
  appointments: GroomerClientAppointment[];
  nextAppointmentAt: string | null;
  lastAppointmentAt: string | null;
}

function clientKeyForAppointment(appointment: Appointment): string {
  const phone = normalizePhone(appointment.phone);
  if (phone.length >= 10) return `phone:${phone}`;
  return `appointment:${appointment.id}`;
}

function findLeadForAppointment(
  appointment: Appointment,
  leads: Lead[]
): Lead | null {
  const byId = leads.find((lead) => lead.appointmentId === appointment.id);
  if (byId) return byId;

  const phone = normalizePhone(appointment.phone);
  if (phone.length < 10) return null;

  return leads.find((lead) => normalizePhone(lead.phone) === phone) ?? null;
}

function mergePets(
  appointments: Appointment[]
): { petName: string; petSize: string }[] {
  const seen = new Set<string>();
  const pets: { petName: string; petSize: string }[] = [];

  for (const appointment of appointments) {
    for (const pet of getAppointmentPets(appointment)) {
      if (!pet.petSize) continue;
      const id = `${pet.petName}|${pet.petSize}`;
      if (seen.has(id)) continue;
      seen.add(id);
      pets.push(pet);
    }
  }

  return pets;
}

export async function listGroomerActiveClients(
  groomerId: GroomerId
): Promise<GroomerClientRecord[]> {
  const [{ appointments }, { leads }] = await Promise.all([
    readSchedulingData(),
    readLeadsData(),
  ]);
  const now = Date.now();

  const groomerAppointments = appointments
    .filter((a) => a.groomerId === groomerId && a.status === "confirmed")
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const groups = new Map<string, Appointment[]>();
  for (const appointment of groomerAppointments) {
    const key = clientKeyForAppointment(appointment);
    const list = groups.get(key) ?? [];
    list.push(appointment);
    groups.set(key, list);
  }

  const clients: GroomerClientRecord[] = [];

  for (const [key, group] of groups) {
    const sorted = [...group].sort((a, b) => a.startAt.localeCompare(b.startAt));
    const latest = sorted[sorted.length - 1];
    const lead = findLeadForAppointment(latest, leads);

    const appointmentSummaries: GroomerClientAppointment[] = sorted.map((ap) => ({
      id: ap.id,
      startAt: ap.startAt,
      service: ap.service,
      petName: ap.petName,
      petSize: ap.petSize,
      isUpcoming: new Date(ap.startAt).getTime() >= now,
    }));

    const upcoming = appointmentSummaries.filter((ap) => ap.isUpcoming);
    const past = appointmentSummaries.filter((ap) => !ap.isUpcoming);

    clients.push({
      key,
      leadId: lead?.id ?? null,
      anchorAppointmentId: latest.id,
      firstName: latest.firstName,
      lastName: latest.lastName,
      phone: latest.phone,
      pets: mergePets(sorted),
      notes: lead?.notes ?? [],
      appointments: [...upcoming, ...past.reverse()],
      nextAppointmentAt: upcoming[0]?.startAt ?? null,
      lastAppointmentAt: past[past.length - 1]?.startAt ?? null,
    });
  }

  clients.sort((a, b) => {
    if (a.nextAppointmentAt && b.nextAppointmentAt) {
      return a.nextAppointmentAt.localeCompare(b.nextAppointmentAt);
    }
    if (a.nextAppointmentAt) return -1;
    if (b.nextAppointmentAt) return 1;
    if (a.lastAppointmentAt && b.lastAppointmentAt) {
      return b.lastAppointmentAt.localeCompare(a.lastAppointmentAt);
    }
    return 0;
  });

  return clients;
}
