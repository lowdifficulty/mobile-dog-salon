/** Build an embedded Google Maps directions view (requires Maps Embed API on the key). */
export function buildGoogleMapsEmbedUrl(
  depotAddress: string,
  stopAddresses: string[]
): string | null {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return null;

  const params = new URLSearchParams({
    key,
    origin: depotAddress,
    destination: depotAddress,
    mode: "driving",
  });

  if (stopAddresses.length > 0) {
    params.set("waypoints", stopAddresses.join("|"));
  }

  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
}
