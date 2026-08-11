/** Internal CRM identity when a customer books with phone only (not for outbound email). */
export const BOOKING_PLACEHOLDER_EMAIL_DOMAIN = "booking.mobiledog-salon.com";

export function isValidCustomerEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isPlaceholderBookingEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return true;
  return trimmed.endsWith(`@${BOOKING_PLACEHOLDER_EMAIL_DOMAIN}`);
}

export function bookingEmailFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@${BOOKING_PLACEHOLDER_EMAIL_DOMAIN}`;
}

/** Real inbox address for customer notifications, or null when only phone was collected. */
export function customerNotificationEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed || isPlaceholderBookingEmail(trimmed)) return null;
  if (!isValidCustomerEmail(trimmed)) return null;
  return trimmed;
}

export function resolveBookingEmail(phone: string, email?: string | null): string {
  const emailTrimmed = String(email ?? "").trim();
  if (emailTrimmed && isValidCustomerEmail(emailTrimmed)) {
    return emailTrimmed;
  }
  return bookingEmailFromPhone(phone);
}
