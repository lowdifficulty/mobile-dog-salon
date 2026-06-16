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
  startAt: string; // ISO
  durationMinutes: number;
  status: AppointmentStatus;
  petName: string;
  petBreed: string;
  petSize: string;
  service: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsOptIn: boolean;
  address: string;
  city: string;
  notes: string;
  createdAt: string;
}

export interface SchedulingData {
  availability: AvailabilityDay[];
  appointments: Appointment[];
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
