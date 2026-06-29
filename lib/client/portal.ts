import type { ClientAccount, ClientSessionUser } from "@/lib/payments/types";

export function clientToSessionUser(account: ClientAccount): ClientSessionUser {
  return {
    id: account.id,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    phone: account.phone,
    lockedInDiscount: account.lockedInDiscount ?? false,
    pendingLickyWelcome: account.pendingLickyWelcome ?? false,
  };
}

export const LICKY_WELCOME_MESSAGE =
  "Hi, this is Licky. Can't wait to meet your dog! If you need to cancel or reschedule you can log in here and I'll be available. Click next to continue!";

export const LICKY_AVATAR = "/images/booking/dog-small.png";
