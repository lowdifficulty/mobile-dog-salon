import type { GroomerId } from "@/lib/scheduling/types";

export type BookingVariantId =
  | "default"
  | "jessica"
  | "melanie"
  | "bookhb"
  | "bookoc";

export const BOOKING_HASHES = {
  book: "#book",
  jessica: "#jessica",
  melanie: "#melanie",
  bookhb: "#bookhb",
  bookoc: "#bookoc",
} as const;

export type BookingHash = (typeof BOOKING_HASHES)[keyof typeof BOOKING_HASHES];

export interface BookingVariant {
  id: BookingVariantId;
  hash: BookingHash;
  /** When set, the booking calendar only shows this groomer's open slots. */
  groomerId?: GroomerId;
  /** When set, only these groomers appear on the default calendar. */
  groomerIds?: GroomerId[];
  /** Client-facing name overrides; groomerId in slotKey is unchanged. */
  groomerDisplayNames?: Partial<Record<GroomerId, string>>;
  /** Prefilled on the address step */
  defaultCity: string;
  zipPlaceholder: string;
  leadSource:
    | "booking-hb"
    | "booking-oc"
    | "booking-jessica"
    | "booking-melanie";
}

export const BOOKING_VARIANTS: Record<
  Exclude<BookingVariantId, "default">,
  BookingVariant
> = {
  jessica: {
    id: "jessica",
    hash: "#jessica",
    groomerId: "jessica",
    defaultCity: "Whittier",
    zipPlaceholder: "90601",
    leadSource: "booking-jessica",
  },
  melanie: {
    id: "melanie",
    hash: "#melanie",
    groomerId: "melanie",
    defaultCity: "Newport Beach",
    zipPlaceholder: "92663",
    leadSource: "booking-melanie",
  },
  bookhb: {
    id: "bookhb",
    hash: "#bookhb",
    groomerId: "jessica",
    defaultCity: "Whittier",
    zipPlaceholder: "90601",
    leadSource: "booking-hb",
  },
  bookoc: {
    id: "bookoc",
    hash: "#bookoc",
    groomerIds: ["melanie", "diamond"],
    defaultCity: "Newport Beach",
    zipPlaceholder: "92663",
    leadSource: "booking-oc",
  },
};

const HASH_TO_VARIANT: Record<BookingHash, BookingVariantId> = {
  "#book": "default",
  "#jessica": "jessica",
  "#melanie": "melanie",
  "#bookhb": "bookhb",
  "#bookoc": "bookoc",
};

/** Territory ad pages map plain #book to territory defaults (city, lead source). */
export function resolveBookingVariantId(pathname: string, hash: string): BookingVariantId {
  const normalized = hash.toLowerCase();
  if (normalized === "#jessica") return "jessica";
  if (normalized === "#melanie") return "melanie";
  if (normalized === "#bookhb") return "bookhb";
  if (normalized === "#bookoc") return "bookoc";
  if (normalized === "#book") {
    const path = pathname.replace(/\/$/, "") || "/";
    if (path === "/la") return "bookhb";
    if (path === "/oc") return "bookoc";
    if (path === "/jessica") return "jessica";
    if (path === "/melanie") return "melanie";
    return "default";
  }
  return "default";
}

export function resolveBookingVariantFromPath(pathname: string): BookingVariantId {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/jessica") return "jessica";
  if (path === "/melanie") return "melanie";
  if (path === "/la") return "bookhb";
  if (path === "/oc") return "bookoc";
  return "default";
}

export function isBookingHash(hash: string): hash is BookingHash {
  const normalized = hash.toLowerCase();
  return (
    normalized === "#book" ||
    normalized === "#jessica" ||
    normalized === "#melanie" ||
    normalized === "#bookhb" ||
    normalized === "#bookoc"
  );
}

export function parseBookingHash(hash: string): BookingVariantId {
  const normalized = hash.toLowerCase();
  if (isBookingHash(normalized)) return HASH_TO_VARIANT[normalized as BookingHash];
  return "default";
}

export function getBookingVariant(id: BookingVariantId): BookingVariant | null {
  if (id === "default") return null;
  return BOOKING_VARIANTS[id];
}
