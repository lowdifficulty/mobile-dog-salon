import { isValidInterviewSlotKey } from "./slots";
import type { InterviewBookingInput } from "./types";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 10;
}

export function validateInterviewBookingInput(body: unknown): InterviewBookingInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid booking.");
  }

  const raw = body as Record<string, unknown>;
  const slotKey = String(raw.slotKey ?? "").trim();
  const fullName = String(raw.fullName ?? "").trim();
  const email = String(raw.email ?? "").trim();
  const phone = String(raw.phone ?? "").trim();

  if (!isValidInterviewSlotKey(slotKey)) {
    throw new Error("Please select a valid interview time.");
  }
  if (fullName.length < 2) {
    throw new Error("Please enter your full name.");
  }
  if (!isValidEmail(email)) {
    throw new Error("Please enter a valid email address.");
  }
  if (!isValidPhone(phone)) {
    throw new Error("Please enter a valid phone number.");
  }

  return { slotKey, fullName, email, phone };
}
