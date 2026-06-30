import type { LickyGuestState } from "@/lib/client/licky-guest-types";
import type { ClientAccount } from "@/lib/payments/types";

export interface LickyActionContext {
  account?: ClientAccount;
  guest?: LickyGuestState;
  saveGuest?: (patch: Partial<LickyGuestState>) => Promise<void>;
  loggedIn: boolean;
  holdOwnerId: string;
}
