import type { FranchiseInquiryInput } from "./types";

function requiredString(value: unknown, label: string): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) throw new Error(`Please enter ${label}.`);
  return trimmed;
}

export function validateFranchiseInquiryInput(body: unknown): FranchiseInquiryInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid request.");
  }

  const data = body as Record<string, unknown>;
  const email = requiredString(data.email, "your email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const phone = requiredString(data.phone, "your phone").replace(/\D/g, "");
  if (phone.length < 10) {
    throw new Error("Please enter a valid phone number.");
  }

  return {
    firstName: requiredString(data.firstName, "your first name"),
    lastName: requiredString(data.lastName, "your last name"),
    email,
    phone: String(data.phone).trim(),
    city: requiredString(data.city, "your city"),
    state: requiredString(data.state, "your state"),
    desiredTerritory: requiredString(data.desiredTerritory, "your desired territory"),
    isGroomer: requiredString(data.isGroomer, "whether you are a groomer"),
    groomPlan: requiredString(data.groomPlan, "your grooming plan"),
    ownsVan: requiredString(data.ownsVan, "whether you own a van"),
    investmentCapital: requiredString(data.investmentCapital, "investment capital"),
    interestedInFinancing: requiredString(data.interestedInFinancing, "financing interest"),
    candidateType: requiredString(data.candidateType, "candidate type"),
    timeline: requiredString(data.timeline, "timeline"),
    interestReason: requiredString(data.interestReason, "why you are interested"),
  };
}
