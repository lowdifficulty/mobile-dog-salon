import "server-only";

import type { EmailTemplateVariable } from "./email-template-types";
import type { Appointment } from "@/lib/scheduling/types";
import { ROUTES } from "@/lib/routes";
import { companyLegal } from "@/lib/company-legal";
import {
  DEFAULT_BOOK_URL,
  DEFAULT_MELANIE_BOOK_URL,
} from "./email-templates-defaults";
import { buildIcsEvent } from "@/lib/scheduling/calendar";
import { appointmentEmailVariables } from "./appointment-email-vars";

export const TEST_EMAIL_FROM =
  process.env.EMAIL_TEST_FROM?.trim() ?? "Mobile Dog Salon <team@mobiledog-salon.com>";

/** Sample appointment for preview / test sends (Pacific, ~1 week out). */
export function sampleTestAppointment(): Appointment {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  start.setHours(14, 0, 0, 0);

  return {
    id: "test-email-preview",
    groomerId: "melanie",
    startAt: start.toISOString(),
    durationMinutes: 180,
    status: "confirmed",
    petName: "Bella",
    petBreed: "Goldendoodle",
    petSize: "large",
    service: "full-groom",
    firstName: "Alex",
    lastName: "Sample",
    email: "customer@example.com",
    phone: "(714) 555-0100",
    smsOptIn: true,
    address: "123 Main St",
    city: "Newport Beach",
    zipCode: "92663",
    notes: "[TEST] Sample appointment for email preview",
    createdAt: new Date().toISOString(),
  };
}

export function sampleEmailVariables(
  overrides?: Partial<Record<EmailTemplateVariable, string>>
): Record<EmailTemplateVariable, string> {
  const appt = sampleTestAppointment();
  const vars = appointmentEmailVariables(appt, { discountActive: true });
  vars.discountLine =
    "Your 50% phone discount is applied to this visit. Rebook to keep enjoying discounted grooming.";
  return { ...vars, ...overrides };
}

export function sampleConfirmationAttachment(): {
  filename: string;
  content: string;
  contentType: string;
} {
  const ics = buildIcsEvent(sampleTestAppointment());
  return {
    filename: "appointment.ics",
    content: Buffer.from(ics).toString("base64"),
    contentType: "text/calendar; method=REQUEST",
  };
}

export function sampleManageUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://mobiledog-salon.com";
  return `${base}${ROUTES.myAppointment}`;
}

export { DEFAULT_BOOK_URL, DEFAULT_MELANIE_BOOK_URL, companyLegal };
