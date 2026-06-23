export type PetSizeTier = "small" | "medium" | "large";

export const PET_SIZES = [
  { value: "small" as const, title: "Small Dog", weight: "1-30 lbs", label: "Small Dog (1-30 lbs)" },
  { value: "medium" as const, title: "Medium Dog", weight: "30-50 lbs", label: "Medium Dog (30-50 lbs)" },
  { value: "large" as const, title: "Large Dog", weight: "50+ lbs", label: "Large Dog (50+ lbs)" },
];

export const GROOMING_SERVICES = [
  { value: "full-groom", label: "Full Groom and Haircut" },
  { value: "bath-brush", label: "Bath & Brush" },
] as const;

export type GroomingServiceId = (typeof GROOMING_SERVICES)[number]["value"];

export type CatServiceId = "cat-bath" | "cat-groom";

export const CAT_PET_SIZE = "cat";

export const CAT_GROOMING_SERVICES = [
  {
    value: "cat-bath" as const,
    label: "Cat Bath",
    description: "Bath, brush, nails, clean ears",
  },
  {
    value: "cat-groom" as const,
    label: "Cat Haircut",
    description: "Haircut includes a bath",
  },
];

/** List prices before the 50% discount */
export const CAT_SERVICE_LIST_PRICING: Record<CatServiceId, number> = {
  "cat-bath": 200,
  "cat-groom": 260,
};

export function isCatService(service: string): boolean {
  return service === "cat-bath" || service === "cat-groom";
}

export function getCatServiceListPrice(service: string): number | null {
  if (service in CAT_SERVICE_LIST_PRICING) {
    return CAT_SERVICE_LIST_PRICING[service as CatServiceId];
  }
  return null;
}

export function getCatQuotedServicePrice(service: string, discountActive: boolean): number | null {
  const list = getCatServiceListPrice(service);
  if (list == null) return null;
  return discountActive ? list / 2 : list;
}

/** Prices in USD by size tier and service */
export const SERVICE_PRICING: Record<
  PetSizeTier,
  Record<GroomingServiceId, number>
> = {
  small: {
    "full-groom": 90,
    "bath-brush": 70,
  },
  medium: {
    "full-groom": 100,
    "bath-brush": 80,
  },
  large: {
    "full-groom": 110,
    "bath-brush": 90,
  },
};

export function normalizePetSize(size: string): PetSizeTier {
  if (size === "medium") return "medium";
  if (size === "large" || size === "xlarge") return "large";
  return "small";
}

export function getServicePrice(
  petSize: string,
  service: string
): number | null {
  if (petSize === CAT_PET_SIZE || isCatService(service)) {
    return getCatQuotedServicePrice(service, true);
  }
  const tier = normalizePetSize(petSize);
  const prices = SERVICE_PRICING[tier];
  if (service in prices) {
    return prices[service as GroomingServiceId];
  }
  return null;
}

/** Discounted price shown when the customer enters a phone number on step 1. */
export function getDiscountedServicePrice(
  petSize: string,
  service: string
): number | null {
  return getServicePrice(petSize, service);
}

/** Full price before the 50% phone discount (2× the discounted rate). */
export function getListServicePrice(
  petSize: string,
  service: string
): number | null {
  if (petSize === CAT_PET_SIZE || isCatService(service)) {
    return getCatServiceListPrice(service);
  }
  const discounted = getDiscountedServicePrice(petSize, service);
  return discounted != null ? discounted * 2 : null;
}

export function getQuotedServicePrice(
  petSize: string,
  service: string,
  discountActive: boolean
): number | null {
  const list = getListServicePrice(petSize, service);
  if (list == null) return null;
  return discountActive ? list / 2 : list;
}

export function formatPrice(amount: number): string {
  return `$${amount}`;
}

export function getServiceLabel(service: string): string {
  const cat = CAT_GROOMING_SERVICES.find((s) => s.value === service);
  if (cat) return cat.label;
  return (
    GROOMING_SERVICES.find((s) => s.value === service)?.label ?? service
  );
}

export function getCatServiceDescription(service: string): string | undefined {
  return CAT_GROOMING_SERVICES.find((s) => s.value === service)?.description;
}
