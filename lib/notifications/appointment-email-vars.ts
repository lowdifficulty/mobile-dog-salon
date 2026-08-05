import "server-only";
import type { Appointment } from "@/lib/scheduling/types";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { formatPetsList, getAppointmentPetLabel, getAppointmentPets } from "@/lib/booking/pets";
import { appointmentSummaryLines } from "./appointment-format";
import { companyLegal } from "@/lib/company-legal";
import { ROUTES } from "@/lib/routes";
import {
  DEFAULT_BOOK_URL,
  DEFAULT_MELANIE_BOOK_URL,
} from "./email-templates-defaults";
import type { EmailTemplateVariable } from "./email-template-types";

function siteBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//, "")}`
      : "") ||
    "https://mobiledog-salon.com";
  return raw.replace(/\/$/, "");
}

export function appointmentEmailVariables(
  appointment: Appointment,
  options?: { discountActive?: boolean }
): Record<EmailTemplateVariable, string> {
  const { groomerName, serviceLabel, when } = appointmentSummaryLines(appointment);
  const petLabel = getAppointmentPetLabel(appointment);
  const petSummary = formatPetsList(getAppointmentPets(appointment));
  const base = siteBase();
  const manageUrl = `${base}${ROUTES.myAppointment}`;
  const bookUrl = `${base}${ROUTES.book}`;
  const melanieBookUrl = `${base}/melanie`;

  const discountActive = options?.discountActive ?? appointment.smsOptIn;
  const discountLine = discountActive
    ? "Your 50% phone discount is applied to this visit. Rebook to keep enjoying discounted grooming."
    : "Book again anytime — ask about our phone discount when you schedule your next visit.";

  return {
    firstName: appointment.firstName,
    lastName: appointment.lastName,
    petLabel,
    petSummary,
    groomerName,
    serviceLabel,
    dateLine: when.dateLine,
    timeRange: when.timeRange,
    address: formatAppointmentAddress(appointment),
    manageUrl,
    bookUrl: process.env.EMAIL_BOOK_URL ?? bookUrl ?? DEFAULT_BOOK_URL,
    melanieBookUrl: process.env.EMAIL_MELANIE_BOOK_URL ?? melanieBookUrl ?? DEFAULT_MELANIE_BOOK_URL,
    businessPhone: companyLegal.businessPhoneDisplay,
    discountLine,
    phone: appointment.phone,
    email: appointment.email,
  };
}
