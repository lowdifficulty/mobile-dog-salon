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
  /** Guest declined the name/phone gate and still wants to chat. */
  skippedIdentify?: boolean;
  /** Name + phone collected (or looked up) for this chat session. */
  identifyComplete?: boolean;
  /** Incomplete identify replies before we stop asking. */
  identifyAttempts?: number;
  petName?: string;
  petSize?: string;
}
