import {
  isInterviewSlotBookable,
  isValidInterviewSlotKey,
  parseInterviewSlotKey,
} from "./slots";
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
  const yearsExperienceRaw = raw.yearsExperience;
  const yearsExperience =
    typeof yearsExperienceRaw === "number"
      ? yearsExperienceRaw
      : Number(String(yearsExperienceRaw ?? "").trim());

  if (!isValidInterviewSlotKey(slotKey)) {
    throw new Error("Please select a valid interview time.");
  }
  const parsed = parseInterviewSlotKey(slotKey);
  if (!parsed || !isInterviewSlotBookable(parsed.date, parsed.time24)) {
    throw new Error(
      "Interview times must be booked at least 24 hours in advance. Please choose a later slot."
    );
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
  if (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 60) {
    throw new Error("Please enter your years of grooming experience (0–60).");
  }

  return { slotKey, fullName, email, phone, yearsExperience: Math.floor(yearsExperience) };
}
