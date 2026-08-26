export type MassSmsCampaignKind = "rebook" | "lead-nurture" | "cancelled";

export interface MassSmsSentRecord {
  phoneKey: string;
  appointmentId?: string;
  leadId?: string;
  firstName: string;
  petName: string;
  sentAt: string;
  twilioSid?: string;
  error?: string;
}

export interface MassSmsCampaignData {
  /** ISO date of Monday for the campaign week (YYYY-MM-DD). */
  campaignWeek: string;
  sent: MassSmsSentRecord[];
  lastBatchAt?: string;
}

export interface MassSmsEligibleContact {
  phoneKey: string;
  phone: string;
  firstName: string;
  lastName: string;
  petName?: string;
  /** Rebook — last completed visit */
  lastVisitAt?: string;
  lastVisitAppointmentId?: string;
  daysSinceVisit?: number;
  groomerName?: string;
  /** Lead nurture — never booked */
  leadId?: string;
  funnelStep?: string;
  daysSinceContact?: number;
  /** Cancelled — most recent cancellation */
  cancelledAt?: string;
  cancelledAppointmentId?: string;
  daysSinceCancelled?: number;
  sentThisWeek: boolean;
  sentAt?: string;
}

export interface MassSmsStatus {
  kind?: MassSmsCampaignKind;
  campaignWeek: string;
  eligibleCount: number;
  pendingCount: number;
  sentThisWeekCount: number;
  lastBatchAt?: string;
  messagePreview: string;
}
