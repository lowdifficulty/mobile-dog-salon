import { NextResponse } from "next/server";
import { createFranchiseInquiry } from "@/lib/franchise/store";
import { validateFranchiseInquiryInput } from "@/lib/franchise/validate";
import { upsertLead } from "@/lib/leads/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = validateFranchiseInquiryInput(body);
    const inquiry = await createFranchiseInquiry(input);

    const message = [
      "Franchise inquiry",
      `Territory: ${input.desiredTerritory}`,
      `City/State: ${input.city}, ${input.state}`,
      `Groomer today: ${input.isGroomer}`,
      `Plan: ${input.groomPlan}`,
      `Owns van: ${input.ownsVan}`,
      `Investment: ${input.investmentCapital}`,
      `Financing: ${input.interestedInFinancing}`,
      `Candidate type: ${input.candidateType}`,
      `Timeline: ${input.timeline}`,
      "",
      input.interestReason,
    ].join("\n");

    await upsertLead({
      funnelStep: "contact_info",
      source: "franchise",
      fullName: `${input.firstName} ${input.lastName}`,
      email: input.email,
      phone: input.phone,
      city: input.city,
      zipCode: input.state,
      message,
    });

    return NextResponse.json({ success: true, inquiryId: inquiry.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit inquiry";
    const status =
      message.startsWith("Please") || message === "Invalid request." ? 400 : 500;
    if (status === 500) {
      console.error("Franchise inquiry failed:", err);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
