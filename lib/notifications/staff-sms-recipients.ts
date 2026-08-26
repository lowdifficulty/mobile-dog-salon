import "server-only";
import type { GroomerId } from "@/lib/scheduling/types";

/** Matthew — notified on every new booking. */
export const OWNER_BOOKING_NOTIFY_PHONE = "9493863351";

/** Groomer cell numbers for new-booking SMS. Keep server-only (not on public GROOMERS). */
export const GROOMER_BOOKING_SMS_PHONES: Partial<Record<GroomerId, string>> = {
  melanie: "7142517732",
  jessica: "6823665544",
};

/** Extra team phones notified on new bookings for a groomer (e.g. Jessica + Chris). */
export const GROOMER_EXTRA_BOOKING_SMS_PHONES: Partial<Record<GroomerId, string[]>> = {
  jessica: ["6616747893"],
};
