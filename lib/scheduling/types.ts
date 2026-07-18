import type { VanId } from "./vans";

export type { VanId };

export type GroomerId = "melanie" | "diamond";

export type AppointmentStatus = "confirmed" | "cancelled";

export interface AvailabilityDay {
  groomerId: GroomerId;
  date: string; // YYYY-MM-DD
  times: string[]; // HH:mm 24h start times
}

export interface Appointment {
  id: string;
  groomerId: GroomerId;
  /** Grooming van — defaults from groomer (Melanie → Nissan, Diamond → Dodge). */
  van?: VanId;
  startAt: string; // ISO
  durationMinutes: number;
  status: AppointmentStatus;
  petName: string;
  petBreed: string;
  petSize: string;
  additionalPets?: { petName: string; petSize: string }[];
  service: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsOptIn: boolean;
  address: string;
  city: string;
  zipCode: string;
  notes: string;
  createdAt: string;
  /** ISO timestamp when 24-hour reminder email was sent */
  reminder24hEmailSentAt?: string;
  /** ISO timestamp when 24-hour reminder SMS was sent */
  reminder24hSmsSentAt?: string;
  /** ISO timestamp when 2-hour reminder email was sent */
  reminder2hEmailSentAt?: string;
  /** ISO timestamp when 2-hour reminder SMS was sent */
  reminder2hSmsSentAt?: string;
}

export interface SchedulingData {
  availability: AvailabilityDay[];
  appointments: Appointment[];
}

export type AvailabilityHistoryAction =
  | "groomer_save"
  | "groomer_erase"
  | "booking"
  | "appointment_cancel"
  | "appointment_delete"
  | "appointment_reschedule"
  | "admin_restore"
  | "system_init"
  | "system_migrate";

export interface AvailabilityHistoryEntry {
  id: string;
  at: string;
  action: AvailabilityHistoryAction;
  actor: string;
  groomerId?: GroomerId;
  summary: string;
  groomerDaysBefore?: number;
  groomerDaysAfter?: number;
  scheduling: SchedulingData;
}

export interface WriteSchedulingMeta {
  action: AvailabilityHistoryAction;
  actor: string;
  groomerId?: GroomerId;
}

export interface AvailableSlot {
  groomerId: GroomerId;
  groomerName: string;
  date: string;
  time: string; // HH:mm
  displayTime: string;
  slotKey: string;
}

export interface SessionUser {
  role: "groomer" | "admin";
  groomerId?: GroomerId;
  email: string;
  name: string;
}
