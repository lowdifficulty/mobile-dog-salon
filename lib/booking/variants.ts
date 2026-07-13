import type { GroomerId } from "@/lib/scheduling/types";

export type BookingVariantId = "default" | "bookhb" | "bookoc";

export const BOOKING_HASHES = {
  book: "#book",
  bookhb: "#bookhb",
  bookoc: "#bookoc",
} as const;

export type BookingHash = (typeof BOOKING_HASHES)[keyof typeof BOOKING_HASHES];

export interface BookingVariant {
  id: BookingVariantId;
  hash: BookingHash;
  /** When set, the booking calendar only shows this groomer's open slots. */
  groomerId?: GroomerId;
  /** Prefilled on the address step */
  defaultCity: string;
  zipPlaceholder: string;
  leadSource: "booking-hb" | "booking-oc";
}

export const BOOKING_VARIANTS: Record<Exclude<BookingVariantId, "default">, BookingVariant> = {
  bookhb: {
    id: "bookhb",
    hash: "#bookhb",
    groomerId: "diamond",
    defaultCity: "Long Beach",
    zipPlaceholder: "90803",
    leadSource: "booking-hb",
  },
  bookoc: {
    id: "bookoc",
    hash: "#bookoc",
    defaultCity: "Newport Beach",
    zipPlaceholder: "92663",
    leadSource: "booking-oc",
  },
};

const HASH_TO_VARIANT: Record<BookingHash, BookingVariantId> = {
  "#book": "default",
  "#bookhb": "bookhb",
  "#bookoc": "bookoc",
};

/** Territory ad pages map plain #book to territory defaults (city, lead source). */
export function resolveBookingVariantId(pathname: string, hash: string): BookingVariantId {
  if (hash === "#bookhb") return "bookhb";
  if (hash === "#bookoc") return "bookoc";
  if (hash === "#book") {
    const path = pathname.replace(/\/$/, "") || "/";
    if (path === "/la") return "bookhb";
    if (path === "/oc") return "bookoc";
    return "default";
  }
  return "default";
}

export function resolveBookingVariantFromPath(pathname: string): BookingVariantId {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/la") return "bookhb";
  if (path === "/oc") return "bookoc";
  return "default";
}

export function isBookingHash(hash: string): hash is BookingHash {
  return hash === "#book" || hash === "#bookhb" || hash === "#bookoc";
}

export function parseBookingHash(hash: string): BookingVariantId {
  if (isBookingHash(hash)) return HASH_TO_VARIANT[hash];
  return "default";
}

export function getBookingVariant(id: BookingVariantId): BookingVariant | null {
  if (id === "default") return null;
  return BOOKING_VARIANTS[id];
}
