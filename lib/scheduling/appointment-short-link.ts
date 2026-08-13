import "server-only";
import { randomBytes } from "crypto";
import { SITE_URL } from "@/lib/site-url";
import type { Appointment } from "./types";
import { readSchedulingData, writeSchedulingData } from "./store";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const CODE_LENGTH = 7;

export function newAppointmentShortCode(existing: Set<string>): string {
  for (let attempt = 0; attempt < 24; attempt++) {
    const bytes = randomBytes(CODE_LENGTH);
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += ALPHABET[bytes[i]! % ALPHABET.length];
    }
    if (!existing.has(code)) return code;
  }
  throw new Error("Could not allocate appointment short code");
}

export function existingAppointmentShortCodes(appointments: Appointment[]): Set<string> {
  const used = new Set<string>();
  for (const appointment of appointments) {
    if (appointment.shortCode) used.add(appointment.shortCode);
  }
  return used;
}

export function withAppointmentShortCode(
  appointment: Appointment,
  existing: Set<string>
): Appointment {
  if (appointment.shortCode) {
    existing.add(appointment.shortCode);
    return appointment;
  }
  const shortCode = newAppointmentShortCode(existing);
  existing.add(shortCode);
  return { ...appointment, shortCode };
}

export function appointmentShortPath(code: string): string {
  return `/a/${code.trim().toLowerCase()}`;
}

export function appointmentShortUrl(code: string, base = SITE_URL): string {
  return `${base.replace(/\/$/, "")}${appointmentShortPath(code)}`;
}

export async function findAppointmentByShortCode(
  code: string
): Promise<Appointment | null> {
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(normalized)) return null;
  const { appointments } = await readSchedulingData();
  return appointments.find((appointment) => appointment.shortCode === normalized) ?? null;
}

export async function ensureAppointmentShortCode(
  appointment: Appointment
): Promise<{ appointment: Appointment; url: string }> {
  if (appointment.shortCode) {
    return { appointment, url: appointmentShortUrl(appointment.shortCode) };
  }

  const data = await readSchedulingData();
  const idx = data.appointments.findIndex((item) => item.id === appointment.id);
  const used = existingAppointmentShortCodes(data.appointments);

  if (idx < 0) {
    const next = withAppointmentShortCode(appointment, used);
    return { appointment: next, url: appointmentShortUrl(next.shortCode!) };
  }

  const stored = data.appointments[idx];
  if (stored.shortCode) {
    return { appointment: stored, url: appointmentShortUrl(stored.shortCode) };
  }

  const next = withAppointmentShortCode(stored, used);
  data.appointments[idx] = next;
  await writeSchedulingData(data);
  return { appointment: next, url: appointmentShortUrl(next.shortCode!) };
}
