import "server-only";
import { companyLegal, legalRoutes } from "@/lib/company-legal";
import { formatPetsList, getAppointmentPets } from "@/lib/booking/pets";
import type { Appointment } from "@/lib/scheduling/types";

export function massRebookSmsBody(appointment: Appointment): string {
  const firstName = appointment.firstName.trim() || "there";
  const pets = getAppointmentPets(appointment);
  const petLabel = formatPetsList(pets) || appointment.petName || "your pet";
  const bookUrl = `${companyLegal.siteUrl}${legalRoutes.book}`;
  return `Hi ${firstName}! It's been a few weeks since ${petLabel}'s last Mobile Dog Salon visit. Your 50% discount is still active — book again: ${bookUrl} Reply STOP to opt out.`;
}

export function massRebookSmsPreview(): string {
  return massRebookSmsBody({
    id: "preview",
    groomerId: "melanie",
    startAt: new Date().toISOString(),
    durationMinutes: 180,
    status: "confirmed",
    petName: "Buddy",
    petBreed: "",
    petSize: "medium",
    service: "full_groom",
    firstName: "Alex",
    lastName: "Smith",
    email: "alex@example.com",
    phone: "+17145551234",
    smsOptIn: true,
    address: "123 Main St",
    city: "Irvine",
    zipCode: "92618",
    notes: "",
    createdAt: new Date().toISOString(),
  });
}
