export type CrmContactStatus = "lead" | "customer" | "inactive";

export type CrmContactSource =
  | "booking"
  | "booking-hb"
  | "booking-oc"
  | "booking-jessica"
  | "booking-melanie"
  | "contact"
  | "franchise"
  | "client_portal"
  | "appointment"
  | "import";

export type CrmInteractionChannel = "sms" | "call" | "note" | "email" | "system";

export type CrmInteractionDirection = "inbound" | "outbound" | "internal";

export type CrmInteractionActor = "system" | "bot" | "staff" | "customer";

export type CrmMessageStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "received";

export type CrmCallStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "no-answer"
  | "canceled"
  | "failed";

export interface CrmPet {
  petName: string;
  petSize?: string;
  petBreed?: string;
}

export interface CrmContact {
  id: string;
  /** Digits-only US phone (10 digits). */
  phone: string;
  /** E.164 when available. */
  phoneE164: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  pets: CrmPet[];
  service?: string;
  smsOptIn?: boolean;
  leadId?: string;
  clientAccountId?: string;
  appointmentIds: string[];
  groomerId?: string;
  groomerName?: string;
  status: CrmContactStatus;
  tags: string[];
  source: CrmContactSource;
  lastInteractionAt?: string;
  lastInboundAt?: string;
  lastOutboundAt?: string;
  unreadCount: number;
  botEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrmInteraction {
  id: string;
  contactId: string;
  phone: string;
  channel: CrmInteractionChannel;
  direction: CrmInteractionDirection;
  body?: string;
  summary?: string;
  messageStatus?: CrmMessageStatus;
  callStatus?: CrmCallStatus;
  twilioSid?: string;
  durationSeconds?: number;
  actor: CrmInteractionActor;
  staffUserId?: string;
  staffName?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export interface CrmData {
  contacts: CrmContact[];
  interactions: CrmInteraction[];
  seededAt?: string;
  version: number;
}

export interface CrmContactDetail extends CrmContact {
  interactions: CrmInteraction[];
  upcomingAppointments: {
    id: string;
    startAt: string;
    status: string;
    service: string;
    petName: string;
    groomerId: string;
  }[];
  pastAppointments: {
    id: string;
    startAt: string;
    status: string;
    service: string;
    petName: string;
    groomerId: string;
  }[];
}
