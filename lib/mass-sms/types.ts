export interface MassSmsSentRecord {
  phoneKey: string;
  appointmentId: string;
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
  petName: string;
  lastVisitAt: string;
  lastVisitAppointmentId: string;
  daysSinceVisit: number;
  groomerName: string;
  sentThisWeek: boolean;
  sentAt?: string;
}

export interface MassSmsStatus {
  campaignWeek: string;
  eligibleCount: number;
  pendingCount: number;
  sentThisWeekCount: number;
  lastBatchAt?: string;
  messagePreview: string;
}
