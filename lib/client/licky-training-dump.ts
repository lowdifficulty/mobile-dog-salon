import "server-only";

import { FAQS, HOW_IT_WORKS_STEPS, PHONE_NUMBER } from "@/lib/constants";
import { lickyCheckAvailability, lickyGetPricing, lickyGetServiceArea } from "@/lib/client/licky-actions";
import { getLickyAvailabilitySlots } from "@/lib/client/licky-availability";
import {
  buildLickyKnowledgeBlock,
  LA_COUNTY_SERVICE_AREAS,
} from "@/lib/client/licky-knowledge";
import { ORANGE_COUNTY_REGIONS } from "@/lib/page-content";
import {
  CAT_GROOMING_SERVICES,
  CAT_SERVICE_LIST_PRICING,
  GROOMING_SERVICES,
  SERVICE_PRICING,
} from "@/lib/pricing";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { getSchedulingPersistenceStatus, readSchedulingData } from "@/lib/scheduling/store";
import { readLickyConfig } from "@/lib/client/licky-config-store";
import type { ClientAccount } from "@/lib/payments/types";

const LICKY_SYSTEM_PROMPT = `You are Licky, the friendly tan Chihuahua mascot for Mobile Dog Salon — mobile dog grooming in Orange County and parts of LA County, California.

Personality: warm, upbeat, helpful, concise. You love dogs. Plain language, not corporate jargon.

You have tools to check live availability, quote prices, explain service area, and manage client appointments (with confirmation).

Rules: use real data from tools; confirm before cancel/reschedule; booking blocks are ~3-hour arrival windows; never diagnose medical issues.`;

function trainingMockAccount(): ClientAccount {
  return {
    id: "licky-training-mock",
    email: "training@mobiledog-salon.com",
    passwordHash: "",
    firstName: "Example",
    lastName: "Client",
    phone: "7145550100",
    squareCustomerId: "",
    createdAt: new Date().toISOString(),
    lockedInDiscount: true,
    registrationComplete: true,
    petProfile: {
      pets: [{ petName: "Buddy", petSize: "medium", notes: "Friendly, nervous with dryers" }],
      notes: "Prefers morning appointments",
    },
  };
}

function slotSummary(slots: Awaited<ReturnType<typeof getLickyAvailabilitySlots>>["slots"]) {
  return slots.slice(0, 40).map((s) => ({
    date: s.date,
    displayTime: s.displayTime,
    groomerId: s.groomerId,
    groomerName: s.groomerName,
    slotKey: s.slotKey,
  }));
}

export async function buildLickyTrainingDump() {
  const persistence = getSchedulingPersistenceStatus();
  const data = await readSchedulingData();
  const mockCtx = { account: trainingMockAccount(), loggedIn: true, holdOwnerId: "training" };

  const fullGroom14 = await getLickyAvailabilitySlots({ service: "full-groom", days: 14 });
  const bath14 = await getLickyAvailabilitySlots({ service: "bath-brush", days: 14 });
  const melanie14 = await getLickyAvailabilitySlots({
    service: "full-groom",
    days: 14,
    groomerId: "melanie",
  });
  const diamond14 = await getLickyAvailabilitySlots({
    service: "full-groom",
    days: 14,
    groomerId: "diamond",
  });

  const sampleAvailabilityText = await lickyCheckAvailability(mockCtx, {
    service: "full-groom",
    days: 14,
  });
  const samplePricingText = await lickyGetPricing(mockCtx, {
    pet_size: "medium",
    service: "full-groom",
  });
  const sampleServiceAreaText = await lickyGetServiceArea();

  const confirmedAppointments = data.appointments.filter((a) => a.status === "confirmed");
  const lickyConfig = await readLickyConfig();

  return {
    generatedAt: new Date().toISOString(),
    purpose:
      "Training / knowledge export for Licky client chatbot — paste into OpenAI project knowledge, fine-tuning prep, or internal QA.",
    systemPrompt: LICKY_SYSTEM_PROMPT,
    customTrainingText: lickyConfig.customTrainingText,
    customTrainingUpdatedAt: lickyConfig.updatedAt,
    knowledgeBlock: buildLickyKnowledgeBlock(),
    persistence: persistence,
    calendarStats: {
      availabilityDayRecords: data.availability.length,
      confirmedAppointments: confirmedAppointments.length,
      openSlotsNext14Days: {
        fullGroom: fullGroom14.slots.length,
        bathBrush: bath14.slots.length,
        melanieFullGroom: melanie14.slots.length,
        diamondFullGroom: diamond14.slots.length,
        source: fullGroom14.source,
        persistenceMode: fullGroom14.persistenceMode,
      },
    },
    liveAvailabilitySnapshot: {
      fullGroom14Days: slotSummary(fullGroom14.slots),
      bathBrush14Days: slotSummary(bath14.slots),
      melanie14Days: slotSummary(melanie14.slots),
      diamond14Days: slotSummary(diamond14.slots),
    },
    groomers: Object.values(GROOMERS).map((g) => ({
      id: g.id,
      staffName: g.name,
      clientDisplayName: g.clientName ?? g.name,
      email: g.email,
    })),
    dogServices: GROOMING_SERVICES,
    catServices: CAT_GROOMING_SERVICES,
    dogPricingUsd: SERVICE_PRICING,
    catPricingUsdList: CAT_SERVICE_LIST_PRICING,
    serviceAreas: {
      orangeCountyRegions: ORANGE_COUNTY_REGIONS,
      laCountyCities: LA_COUNTY_SERVICE_AREAS,
    },
    contact: {
      phone: PHONE_NUMBER,
      website: "https://mobiledog-salon.com",
      bookUrl: "https://mobiledog-salon.com/book",
      clientPortalUrl: "https://mobiledog-salon.com/client/login",
    },
    howItWorks: HOW_IT_WORKS_STEPS,
    faqs: FAQS,
    sampleToolOutputs: {
      check_availability_full_groom_14d: sampleAvailabilityText,
      get_pricing_medium_full_groom: samplePricingText,
      get_service_area: sampleServiceAreaText,
    },
    suggestedClientQuestions: [
      "What times does Melanie have this week?",
      "How much is a bath for a small dog?",
      "Do you groom in Long Beach?",
      "When is my next appointment?",
      "Can I reschedule to Thursday?",
      "What's included in a full groom?",
    ],
  };
}

export function formatLickyTrainingMarkdown(
  dump: Awaited<ReturnType<typeof buildLickyTrainingDump>>
): string {
  const lines: string[] = [
    "# Licky Training / Knowledge Export",
    `Generated: ${dump.generatedAt}`,
    "",
    "## System prompt",
    dump.systemPrompt,
    "",
    "## Custom training text (admin)",
    dump.customTrainingText?.trim()
      ? dump.customTrainingText
      : "(No custom text saved yet.)",
    dump.customTrainingUpdatedAt
      ? `\n_Last updated: ${dump.customTrainingUpdatedAt}_`
      : "",
    "",
    "## Knowledge block",
    dump.knowledgeBlock,
    "",
    "## Calendar snapshot",
    `Persistence: ${dump.persistence.mode} (${dump.persistence.message})`,
    `Open slots (14d): full groom ${dump.calendarStats.openSlotsNext14Days.fullGroom}, bath ${dump.calendarStats.openSlotsNext14Days.bathBrush}`,
    `Melanie: ${dump.calendarStats.openSlotsNext14Days.melanieFullGroom}, Diamond/Sarah: ${dump.calendarStats.openSlotsNext14Days.diamondFullGroom}`,
    "",
    "### Sample availability tool output",
    dump.sampleToolOutputs.check_availability_full_groom_14d,
    "",
    "### Sample pricing tool output",
    dump.sampleToolOutputs.get_pricing_medium_full_groom,
    "",
    "### Service area tool output",
    dump.sampleToolOutputs.get_service_area,
    "",
    "## FAQs",
    ...dump.faqs.map((f) => `**${f.question}**\n${f.answer}`),
  ];
  return lines.join("\n");
}
