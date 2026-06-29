export interface ClientPetProfile {
  petName: string;
  petSize: string;
  notes?: string;
}

export interface ClientAccount {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  squareCustomerId: string;
  createdAt: string;
  /** True after completing post-booking registration — locks 50% discount perk. */
  lockedInDiscount?: boolean;
  registrationComplete?: boolean;
  appointmentIds?: string[];
  petProfile?: {
    pets: ClientPetProfile[];
    notes?: string;
  };
  /** Show Licky welcome once after first registration login. */
  pendingLickyWelcome?: boolean;
}

export interface ClientSessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  lockedInDiscount?: boolean;
  pendingLickyWelcome?: boolean;
}

export interface ClientsData {
  clients: ClientAccount[];
}

export interface SavedCardSummary {
  id: string;
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  cardholderName?: string;
}

export interface PaymentHistoryItem {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  note?: string;
  cardBrand?: string;
  cardLast4?: string;
  customerId?: string;
  clientName?: string;
  clientEmail?: string;
}

export interface ClientListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
