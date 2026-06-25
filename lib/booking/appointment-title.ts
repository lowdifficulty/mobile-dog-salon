import { getAppointmentPets, getPetSizeLabel } from "@/lib/booking/pets";
import {
  formatPrice,
  getQuotedServicePrice,
  getServiceLabel,
} from "@/lib/pricing";
import type { Appointment } from "@/lib/scheduling/types";

export function appointmentHasPhoneDiscount(appointment: { notes?: string }): boolean {
  return appointment.notes?.includes("50% phone discount applied") ?? false;
}

export function getAppointmentBookedPrice(appointment: Appointment): number | null {
  const discountActive = appointmentHasPhoneDiscount(appointment);
  const pets = getAppointmentPets(appointment);
  let total = 0;
  let found = false;

  for (const pet of pets) {
    const price = getQuotedServicePrice(pet.petSize, appointment.service, discountActive);
    if (price != null) {
      total += price;
      found = true;
    }
  }

  return found ? total : null;
}

export function getAppointmentSizeTitle(
  appointment: Pick<Appointment, "petSize" | "petName" | "additionalPets">
): string {
  const pets = getAppointmentPets(appointment);
  const sizes = [...new Set(pets.map((pet) => pet.petSize).filter(Boolean))];

  if (!sizes.length) {
    return appointment.petSize ? getPetSizeLabel(appointment.petSize) : "Pet";
  }
  if (sizes.length === 1) return getPetSizeLabel(sizes[0]);
  return sizes.map(getPetSizeLabel).join(", ");
}

/** e.g. Large Dog - Full Groom and Haircut - $110 */
export function formatAppointmentTitle(appointment: Appointment): string {
  const sizeTitle = getAppointmentSizeTitle(appointment);
  const serviceLabel = getServiceLabel(appointment.service);
  const price = getAppointmentBookedPrice(appointment);
  const segments = [sizeTitle, serviceLabel];
  if (price != null) segments.push(formatPrice(price));
  return segments.join(" - ");
}
