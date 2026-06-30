/** Guest Licky chat state stored in the client session cookie. */
export interface LickyGuestState {
  pendingLickyBooking?: {
    slotKey: string;
    service: string;
    fromFallback?: boolean;
    holdId?: string;
  } | null;
  serviceAddress?: {
    address: string;
    city: string;
    zipCode: string;
  };
  firstName?: string;
  lastName?: string;
  phone?: string;
  petName?: string;
  petSize?: string;
}
