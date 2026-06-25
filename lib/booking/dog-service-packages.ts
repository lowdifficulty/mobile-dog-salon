export const BOOKING_DISCOUNT_BONUS =
  "If you book again within 2 months you always keep your discount.";

export const DOG_SERVICE_PACKAGES = [
  {
    value: "bath-brush",
    label: "Bath Only",
    bullets: [
      "Warm Bath",
      "Brush & Dry",
      "Ear Clean",
      "Nail Trim",
      "Hygiene",
    ],
  },
  {
    value: "full-groom",
    label: "Bath & Haircut",
    bullets: [
      "Warm Bath",
      "Premium Cut",
      "Face/Feet Trim",
      "Nails & Ears",
      "Hygiene",
    ],
  },
] as const;
