export type LeadFunnelStep =
  | "phone_entered"
  | "view_form"
  | "pet_info"
  | "package_selected"
  | "schedule_appointment"
  | "address"
  | "contact_details"
  | "contact_info"
  | "scheduled"
  | "appointment_completed";

/** Booking form steps shown in analytics (matches live form flow). */
export const BOOKING_FUNNEL_STEPS: {
  id: LeadFunnelStep;
  label: string;
  order: number;
}[] = [
  { id: "view_form", label: "View Form", order: 1 },
  { id: "pet_info", label: "Select Size", order: 2 },
  { id: "package_selected", label: "Select Service", order: 3 },
  { id: "schedule_appointment", label: "Schedule Appointment", order: 4 },
  { id: "address", label: "Address", order: 5 },
  { id: "contact_info", label: "Contact Info", order: 6 },
];

/** Full CRM funnel including post-booking milestones. */
export const LEAD_FUNNEL_STEPS: {
  id: LeadFunnelStep;
  label: string;
  order: number;
}[] = [
  ...BOOKING_FUNNEL_STEPS,
  { id: "scheduled", label: "Scheduled", order: 7 },
  { id: "appointment_completed", label: "Completed", order: 8 },
];

const FUNNEL_STEP_ORDERS: Record<LeadFunnelStep, number> = {
  phone_entered: 1,
  view_form: 1,
  pet_info: 2,
  package_selected: 3,
  schedule_appointment: 4,
  address: 5,
  contact_details: 6,
  contact_info: 6,
  scheduled: 7,
  appointment_completed: 8,
};

export function funnelStepOrder(step: LeadFunnelStep): number {
  return FUNNEL_STEP_ORDERS[step] ?? 0;
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
  lastActiveAt?: string;
  notes: LeadNote[];
  source: "booking" | "contact";
  createdAt: string;
  updatedAt: string;
}

export interface LeadsData {
  leads: Lead[];
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
