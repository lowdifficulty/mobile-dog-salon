import type { LickyGuestState } from "@/lib/client/licky-guest-types";
import type { ClientAccount } from "@/lib/payments/types";
import type { ChatMessage } from "@/lib/client/licky-types";

export interface LickyActionContext {
  account?: ClientAccount;
  guest?: LickyGuestState;
  saveGuest?: (patch: Partial<LickyGuestState>) => Promise<void>;
  loggedIn: boolean;
  holdOwnerId: string;
  /** Full conversation for this request — used for booking extraction. */
  conversationMessages?: ChatMessage[];
  request?: Request;
  /** Caller ID digits/E.164 when Hattie is on a phone call (or SMS-like identity). */
  callerPhone?: string;
}
