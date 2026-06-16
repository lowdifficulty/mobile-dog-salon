export interface ClientAccount {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  squareCustomerId: string;
  createdAt: string;
}

export interface ClientSessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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
