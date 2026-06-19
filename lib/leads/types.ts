export type LeadFunnelStep =
  | "phone_entered"
  | "pet_info"
  | "package_selected"
  | "contact_details"
  | "scheduled"
  | "appointment_completed";

export const LEAD_FUNNEL_STEPS: {
  id: LeadFunnelStep;
  label: string;
  order: number;
}[] = [
  { id: "phone_entered", label: "Phone / Offer", order: 1 },
  { id: "pet_info", label: "Pet Info", order: 2 },
  { id: "package_selected", label: "Package", order: 3 },
  { id: "contact_details", label: "Contact Details", order: 4 },
  { id: "scheduled", label: "Scheduled", order: 5 },
  { id: "appointment_completed", label: "Appointment Completed", order: 6 },
];

export function funnelStepOrder(step: LeadFunnelStep): number {
  return LEAD_FUNNEL_STEPS.find((s) => s.id === step)?.order ?? 0;
}

export interface LeadNote {
  id: string;
  text: string;
  createdAt: string;
}

/** FU = follow up (yellow). Chill = on hold (blue). Scheduled leads show green in CRM. */
export type LeadFollowUpMode = "fu" | "chill";

/** active = main leads list. cold_storage = archived subtab (still in analytics). */
export type LeadListStatus = "active" | "cold_storage";

export interface Lead {
  id: string;
  leadSessionId?: string;
  phone: string;
  contactMadeAt: string;
  funnelStep: LeadFunnelStep;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  petName?: string;
  petSize?: string;
  pets?: { petName: string; petSize: string }[];
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  discountActive?: boolean;
  discountSkipped?: boolean;
  smsOptIn?: boolean;
  appointmentId?: string;
  scheduledAt?: string;
  appointmentStartAt?: string;
  groomerId?: string;
  groomerName?: string;
  lastAppointmentAt?: string;
  followUpMode?: LeadFollowUpMode;
  listStatus?: LeadListStatus;
  notes: LeadNote[];
  source: "booking" | "contact";
  createdAt: string;
  updatedAt: string;
}

export interface LeadsData {
  leads: Lead[];
  funnelViews?: FunnelView[];
}

export type FunnelViewSource = "booking_modal" | "book_page";

export interface FunnelView {
  sessionId: string;
  viewedAt: string;
  source: FunnelViewSource;
}

export interface LeadUpsertInput {
  leadSessionId?: string;
  phone?: string;
  email?: string;
  funnelStep: LeadFunnelStep;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  petName?: string;
  petSize?: string;
  pets?: { petName: string; petSize: string }[];
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  discountActive?: boolean;
  discountSkipped?: boolean;
  smsOptIn?: boolean;
  appointmentId?: string;
  scheduledAt?: string;
  appointmentStartAt?: string;
  groomerId?: string;
  groomerName?: string;
  followUpMode?: LeadFollowUpMode;
  listStatus?: LeadListStatus;
  message?: string;
  source?: "booking" | "contact";
}
