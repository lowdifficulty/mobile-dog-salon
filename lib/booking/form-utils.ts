import { getTodayPacificDate, isBookableDate } from "@/lib/scheduling/slots";

export const bookingInputClass = "booking-form-input";

export function splitBookingName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function isValidBookingPhone(phone: string): boolean {
  return phone.trim().replace(/\D/g, "").length >= 10;
}

export function isLocalhostHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

export function getDevSkipBookableDate(): string {
  const today = getTodayPacificDate();
  const [year, month, day] = today.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day + 1, 12));
  const next = probe.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return isBookableDate(next) ? next : today;
}
