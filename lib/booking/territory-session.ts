import {
  resolveBookingVariantFromPath,
  resolveBookingVariantId,
  type BookingVariantId,
} from "@/lib/booking/variants";

function variantFromHash(pathname: string, hash: string): BookingVariantId {
  const normalized = hash.trim().toLowerCase();
  if (!normalized) return "default";
  return resolveBookingVariantId(pathname, normalized);
}

/** Path (/jessica, /melanie, /la, /oc), then legacy hash, then default. */
export function resolveActiveBookingVariantId(
  pathname: string,
  hash: string,
  explicitVariant?: BookingVariantId
): BookingVariantId {
  if (explicitVariant && explicitVariant !== "default") {
    return explicitVariant;
  }

  const fromPath = resolveBookingVariantFromPath(pathname);
  if (fromPath !== "default") {
    return fromPath;
  }

  return variantFromHash(pathname, hash);
}

export function groomerLandingPathForHash(hash: string): "/jessica" | "/melanie" | null {
  const normalized = hash.trim().toLowerCase();
  if (normalized === "#jessica" || normalized === "#bookhb") return "/jessica";
  if (normalized === "#melanie" || normalized === "#bookoc") return "/melanie";
  return null;
}

export function isGroomerAdLandingPath(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  return (
    path === "/jessica" ||
    path === "/melanie" ||
    path === "/la" ||
    path === "/oc"
  );
}
