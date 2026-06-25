export type GeoPrecision = "exact" | "zip";

export interface GeoPoint {
  lat: number;
  lon: number;
  label: string;
  precision: GeoPrecision;
}

const geocodeCache = new Map<string, GeoPoint>();
let lastNominatimAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAddressLine(line: string): string {
  return line
    .replace(/\bSpc\.?\s*/gi, "Space ")
    .replace(/\bSte\.?\s*/gi, "Suite ")
    .replace(/\b#\s*/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

function zipFromText(text: string): string | null {
  const match = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? null;
}

/** Approximate OC zip centroids when street-level geocoding fails. */
const ZIP_FALLBACK: Record<string, Omit<GeoPoint, "label">> = {
  "92602": { lat: 33.6847, lon: -117.8265, precision: "zip" },
  "92603": { lat: 33.6319, lon: -117.7767, precision: "zip" },
  "92604": { lat: 33.6778, lon: -117.7581, precision: "zip" },
  "92606": { lat: 33.6981, lon: -117.8364, precision: "zip" },
  "92612": { lat: 33.6599, lon: -117.7947, precision: "zip" },
  "92614": { lat: 33.6759, lon: -117.7762, precision: "zip" },
  "92617": { lat: 33.6461, lon: -117.8427, precision: "zip" },
  "92618": { lat: 33.6338, lon: -117.7198, precision: "zip" },
  "92620": { lat: 33.7175, lon: -117.8311, precision: "zip" },
  "92625": { lat: 33.6189, lon: -117.9298, precision: "zip" },
  "92626": { lat: 33.6411, lon: -117.9187, precision: "zip" },
  "92627": { lat: 33.6411, lon: -117.9187, precision: "zip" },
  "92630": { lat: 33.6, lon: -117.672, precision: "zip" },
  "92646": { lat: 33.6602, lon: -117.9992, precision: "zip" },
  "92647": { lat: 33.7237, lon: -118.0016, precision: "zip" },
  "92648": { lat: 33.6595, lon: -118.0014, precision: "zip" },
  "92649": { lat: 33.7178, lon: -118.0392, precision: "zip" },
  "92651": { lat: 33.5428, lon: -117.7854, precision: "zip" },
  "92653": { lat: 33.6103, lon: -117.7128, precision: "zip" },
  "92656": { lat: 33.6125, lon: -117.7129, precision: "zip" },
  "92660": { lat: 33.6319, lon: -117.8756, precision: "zip" },
  "92661": { lat: 33.6022, lon: -117.9001, precision: "zip" },
  "92663": { lat: 33.6275, lon: -117.9284, precision: "zip" },
  "92677": { lat: 33.6267, lon: -117.7325, precision: "zip" },
  "92679": { lat: 33.6007, lon: -117.7259, precision: "zip" },
  "92683": { lat: 33.7465, lon: -117.8677, precision: "zip" },
  "92691": { lat: 33.6095, lon: -117.6934, precision: "zip" },
  "92692": { lat: 33.612, lon: -117.6412, precision: "zip" },
  "92694": { lat: 33.5676, lon: -117.7256, precision: "zip" },
  "92701": { lat: 33.7455, lon: -117.8677, precision: "zip" },
  "92703": { lat: 33.7455, lon: -117.93, precision: "zip" },
  "92704": { lat: 33.7178, lon: -117.9319, precision: "zip" },
  "92705": { lat: 33.7455, lon: -117.8262, precision: "zip" },
  "92706": { lat: 33.7595, lon: -117.9067, precision: "zip" },
  "92707": { lat: 33.7081, lon: -117.9534, precision: "zip" },
  "92780": { lat: 33.7465, lon: -117.8171, precision: "zip" },
  "92782": { lat: 33.7178, lon: -117.82, precision: "zip" },
  "92801": { lat: 33.8353, lon: -117.9145, precision: "zip" },
  "92804": { lat: 33.8185, lon: -117.9731, precision: "zip" },
  "92805": { lat: 33.8353, lon: -117.9145, precision: "zip" },
  "92806": { lat: 33.8353, lon: -117.9145, precision: "zip" },
  "92807": { lat: 33.8353, lon: -117.9145, precision: "zip" },
  "92808": { lat: 33.8353, lon: -117.9145, precision: "zip" },
  "92831": { lat: 33.8703, lon: -117.9242, precision: "zip" },
  "92835": { lat: 33.8703, lon: -117.9242, precision: "zip" },
  "92840": { lat: 33.787, lon: -117.8531, precision: "zip" },
  "92841": { lat: 33.787, lon: -117.8531, precision: "zip" },
  "92843": { lat: 33.7674, lon: -117.9401, precision: "zip" },
  "92866": { lat: 33.787, lon: -117.8531, precision: "zip" },
  "92867": { lat: 33.787, lon: -117.8531, precision: "zip" },
  "92868": { lat: 33.787, lon: -117.8531, precision: "zip" },
  "92869": { lat: 33.787, lon: -117.8531, precision: "zip" },
};

function zipCentroid(zip: string | null, label: string): GeoPoint | null {
  if (!zip) return null;
  if (ZIP_FALLBACK[zip]) {
    return { ...ZIP_FALLBACK[zip], label };
  }
  const prefix = zip.slice(0, 3);
  if (prefix === "927") {
    return { lat: 33.736, lon: -117.883, label, precision: "zip" };
  }
  if (prefix === "926") {
    return { lat: 33.67, lon: -117.82, label, precision: "zip" };
  }
  if (prefix === "928") {
    return { lat: 33.82, lon: -117.9, label, precision: "zip" };
  }
  return null;
}

function buildGeocodeQueries(
  fullAddress: string,
  street: string,
  city: string,
  zipCode: string
): string[] {
  const normalizedStreet = normalizeAddressLine(street);
  const streetWithoutUnit = normalizedStreet.replace(/\s+(?:#|space|suite|spc|unit|apt).*/i, "").trim();
  const queries = [
    fullAddress,
    `${normalizedStreet}, ${city}, CA ${zipCode}`,
    streetWithoutUnit ? `${streetWithoutUnit}, ${city}, CA ${zipCode}` : "",
    `${city}, CA ${zipCode}`,
    `${fullAddress}, Orange County, CA`,
  ];
  return [...new Set(queries.filter(Boolean))];
}

async function googleGeocode(query: string): Promise<GeoPoint | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results?: { geometry: { location: { lat: number; lng: number } } }[];
    };
    if (data.status !== "OK" || !data.results?.length) return null;
    const loc = data.results[0].geometry.location;
    return {
      lat: loc.lat,
      lon: loc.lng,
      label: query,
      precision: "exact",
    };
  } catch {
    return null;
  }
}

async function nominatimSearch(query: string): Promise<GeoPoint | null> {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastNominatimAt));
  if (wait > 0) await sleep(wait);
  lastNominatimAt = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MobileDogSalon/1.0 (groomer-routing)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data.length) return null;
    return {
      lat: Number.parseFloat(data[0].lat),
      lon: Number.parseFloat(data[0].lon),
      label: query,
      precision: "exact",
    };
  } catch {
    return null;
  }
}

export async function geocodeAppointmentAddress(input: {
  address: string;
  city: string;
  zipCode: string;
  fullAddress: string;
}): Promise<GeoPoint> {
  const { address, city, zipCode, fullAddress } = input;
  const cacheKey = fullAddress.trim().toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const zip = zipCode.trim() || zipFromText(fullAddress);
  const queries = buildGeocodeQueries(fullAddress, address, city, zipCode);

  for (const query of queries) {
    const google = await googleGeocode(query);
    if (google) {
      geocodeCache.set(cacheKey, google);
      return google;
    }
    const nominatim = await nominatimSearch(query);
    if (nominatim) {
      geocodeCache.set(cacheKey, nominatim);
      return nominatim;
    }
  }

  const zipPoint = zipCentroid(zip, fullAddress);
  if (zipPoint) {
    geocodeCache.set(cacheKey, zipPoint);
    return zipPoint;
  }

  throw new Error(`Could not locate address: ${fullAddress}`);
}

/** Geocode the depot or any single-line address. */
export async function geocodeAddress(fullAddress: string): Promise<GeoPoint> {
  const zip = zipFromText(fullAddress);
  const parts = fullAddress.split(",").map((p) => p.trim());
  const city = parts.length >= 2 ? parts[parts.length - 2] : "";
  const street = parts[0] ?? fullAddress;
  const zipCode = zip ?? "";

  return geocodeAppointmentAddress({
    address: street,
    city,
    zipCode,
    fullAddress,
  });
}
