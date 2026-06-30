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
  "Hi, I'm Licky! Your grooming buddy. Ask me anything — pricing, open times, service area, or let's book a visit together.";

export const LICKY_AVATAR = "/images/booking/dog-small.png";
