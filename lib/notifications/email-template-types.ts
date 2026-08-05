export type EmailTemplateId =
  | "booking_confirmation"
  | "reminder_24h"
  | "reminder_1h"
  | "rebook_3w"
  | "staff_new_booking"
  | "melanie_new_lead";

export interface EmailTemplate {
  id: EmailTemplateId;
  label: string;
  description: string;
  subject: string;
  html: string;
  enabled: boolean;
  updatedAt?: string;
}

export const EMAIL_TEMPLATE_VARIABLES = [
  "firstName",
  "lastName",
  "petLabel",
  "petSummary",
  "groomerName",
  "serviceLabel",
  "dateLine",
  "timeRange",
  "address",
  "manageUrl",
  "bookUrl",
  "melanieBookUrl",
  "businessPhone",
  "discountLine",
  "phone",
  "email",
] as const;

export type EmailTemplateVariable = (typeof EMAIL_TEMPLATE_VARIABLES)[number];
