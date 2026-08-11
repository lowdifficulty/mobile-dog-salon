import { getAppointmentPets, type BookingPet } from "@/lib/booking/pets";
import type { Appointment } from "./types";

export interface StaffBookAppointmentPrefill {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  petName?: string;
  petBreed?: string;
  petSize?: string;
  additionalPets?: BookingPet[];
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  notes?: string;
  /** Suggested visit length for multi-dog rebooks. */
  durationMinutes?: number;
}

export function appointmentToStaffBookPrefill(
  appointment: Appointment
): StaffBookAppointmentPrefill {
  const pets = getAppointmentPets(appointment);
  const [primary, ...rest] = pets;
  return {
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    phone: appointment.phone,
    email: appointment.email,
    petName: primary?.petName ?? appointment.petName,
    petSize: primary?.petSize ?? appointment.petSize,
    petBreed: appointment.petBreed,
    additionalPets: rest.length ? rest : undefined,
    service: appointment.service,
    address: appointment.address,
    city: appointment.city,
    zipCode: appointment.zipCode,
    notes: appointment.notes,
    durationMinutes: appointment.durationMinutes,
  };
}
