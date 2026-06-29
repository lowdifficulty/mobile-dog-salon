import "server-only";

import { PHONE_NUMBER } from "@/lib/constants";
import { ORANGE_COUNTY_REGIONS } from "@/lib/page-content";
import {
  formatPrice,
  getServiceLabel,
  GROOMING_SERVICES,
  PET_SIZES,
  SERVICE_PRICING,
  type PetSizeTier,
} from "@/lib/pricing";
import { GROOMERS, groomerClientDisplayName } from "@/lib/scheduling/groomers";

/** LA County communities we often serve near the OC border (confirm at booking). */
export const LA_COUNTY_SERVICE_AREAS = [
  "Long Beach",
  "Lakewood",
  "Cerritos",
  "Signal Hill",
  "La Mirada",
  "Whittier",
  "Hawaiian Gardens",
  "Artesia",
  "Bellflower",
  "Norwalk",
  "Downey",
  "South Gate",
  "Carson",
  "Torrance (west/south portions near OC)",
] as const;

export function buildLickyKnowledgeBlock(): string {
  const groomerLines = Object.values(GROOMERS).map(
    (g) =>
      `- ${groomerClientDisplayName(g.id)} (id: ${g.id}) — mobile groomer, books in 3-hour arrival windows`
  );

  const regionLines = ORANGE_COUNTY_REGIONS.map(
    (r) => `${r.name}: ${r.cities.slice(0, 6).join(", ")}${r.cities.length > 6 ? ", …" : ""}`
  );

  const priceRows: string[] = [];
  for (const size of PET_SIZES) {
    const tier = size.value as PetSizeTier;
    for (const svc of GROOMING_SERVICES) {
      const list = SERVICE_PRICING[tier][svc.value];
      const discounted = list / 2;
      priceRows.push(
        `${size.label} · ${svc.label}: list ${formatPrice(list)}, typical phone/locked discount ${formatPrice(discounted)}`
      );
    }
  }

  return [
    "COMPANY FACTS",
    `- Phone & text: ${PHONE_NUMBER}`,
    "- We are a mobile dog grooming spa — groomers come to the client's driveway (cage-free, one-on-one).",
    "- Booking blocks are ~3-hour arrival windows (e.g. 8–11 AM, 11 AM–2 PM).",
    "",
    "GROOMERS",
    ...groomerLines,
    "",
    "SERVICE AREA",
    "- Primary: all of Orange County, CA.",
    `- Regions: ${regionLines.join("; ")}`,
    "- We also serve parts of LA County near Orange County:",
    LA_COUNTY_SERVICE_AREAS.map((c) => `  · ${c}`).join("\n"),
    "- If a city isn't listed, clients can still book — we confirm coverage when scheduling.",
    "",
    "DOG GROOMING PRICES (USD, list vs ~50% discount)",
    ...priceRows,
    "- Cat grooming: Cat Bath ~$200 list / ~$100 discounted; Cat Haircut ~$260 list / ~$130 discounted.",
    "- Clients with 'discount locked in' on their account keep the ~50% rate on future dog grooming visits.",
    "",
    "SERVICES",
    "- full-groom: Full Groom and Haircut (bath, haircut, nails, ears, hygiene)",
    "- bath-brush: Bath & Brush (bath, brush, nails, ears, hygiene)",
  ].join("\n");
}
