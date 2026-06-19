import { PET_SIZES } from "@/lib/constants";

export interface BookingPet {
  petName: string;
  petSize: string;
}

export interface DraftPet {
  name: string;
  size: string;
}

export function draftToBookingPet(pet: DraftPet): BookingPet {
  return { petName: pet.name, petSize: pet.size };
}

export function getPetSizeLabel(size: string): string {
  return PET_SIZES.find((entry) => entry.value === size)?.title ?? size;
}

export function formatPetEntry(pet: BookingPet): string {
  if (!pet.petName) return "";
  const sizeLabel = pet.petSize ? getPetSizeLabel(pet.petSize) : "";
  return sizeLabel ? `${pet.petName} (${sizeLabel})` : pet.petName;
}

export function formatPetsList(pets: BookingPet[]): string {
  return pets.map(formatPetEntry).filter(Boolean).join(", ");
}

export function formatPetNames(pets: BookingPet[]): string {
  const names = pets.map((pet) => pet.petName).filter(Boolean);
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function getAppointmentPets(appointment: {
  petName: string;
  petSize: string;
  additionalPets?: BookingPet[];
}): BookingPet[] {
  const pets: BookingPet[] = [
    { petName: appointment.petName, petSize: appointment.petSize },
  ];
  if (appointment.additionalPets?.length) {
    pets.push(...appointment.additionalPets);
  }
  return pets.filter((pet) => pet.petName);
}

export function buildBookingNotes(
  discountActive: boolean,
  additionalPets: BookingPet[]
): string {
  const parts: string[] = [];
  if (discountActive) parts.push("50% phone discount applied");
  if (additionalPets.length) {
    parts.push(`Additional pets: ${formatPetsList(additionalPets)}`);
  }
  return parts.join(". ");
}

export function formatLeadPets(lead: {
  petName?: string;
  petSize?: string;
  pets?: BookingPet[];
}): string {
  if (lead.pets?.length) return formatPetsList(lead.pets);
  if (lead.petName) {
    return formatPetEntry({ petName: lead.petName, petSize: lead.petSize ?? "" });
  }
  return "—";
}
