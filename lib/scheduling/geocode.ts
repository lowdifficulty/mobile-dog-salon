export interface GeoPoint {
  lat: number;
  lon: number;
  label: string;
}

const geocodeCache = new Map<string, GeoPoint | null>();
let lastNominatimAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function nominatimSearch(query: string): Promise<GeoPoint | null> {
  const now = Date.now();
  const wait = Math.max(0, 1100 - (now - lastNominatimAt));
  if (wait > 0) await sleep(wait);
  lastNominatimAt = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
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
  };
}

/** Approximate OC zip centroids when geocoding fails. */
const ZIP_FALLBACK: Record<string, GeoPoint> = {
  "92602": { lat: 33.6847, lon: -117.8265, label: "Irvine" },
  "92603": { lat: 33.6319, lon: -117.7767, label: "Irvine" },
  "92604": { lat: 33.6778, lon: -117.7581, label: "Irvine" },
  "92606": { lat: 33.6981, lon: -117.8364, label: "Irvine" },
  "92612": { lat: 33.6599, lon: -117.7947, label: "Irvine" },
  "92614": { lat: 33.6759, lon: -117.7762, label: "Irvine" },
  "92617": { lat: 33.6461, lon: -117.8427, label: "Irvine" },
  "92618": { lat: 33.6338, lon: -117.7198, label: "Irvine" },
  "92620": { lat: 33.7175, lon: -117.8311, label: "Irvine" },
  "92625": { lat: 33.6189, lon: -117.9298, label: "Corona del Mar" },
  "92626": { lat: 33.6411, lon: -117.9187, label: "Costa Mesa" },
  "92627": { lat: 33.6411, lon: -117.9187, label: "Costa Mesa" },
  "92630": { lat: 33.6000, lon: -117.6720, label: "Lake Forest" },
  "92646": { lat: 33.6602, lon: -117.9992, label: "Huntington Beach" },
  "92647": { lat: 33.7237, lon: -118.0016, label: "Huntington Beach" },
  "92648": { lat: 33.6595, lon: -118.0014, label: "Huntington Beach" },
  "92649": { lat: 33.7178, lon: -118.0392, label: "Huntington Beach" },
  "92651": { lat: 33.5428, lon: -117.7854, label: "Laguna Beach" },
  "92653": { lat: 33.6103, lon: -117.7128, label: "Laguna Hills" },
  "92656": { lat: 33.6125, lon: -117.7129, label: "Aliso Viejo" },
  "92660": { lat: 33.6319, lon: -117.8756, label: "Newport Beach" },
  "92661": { lat: 33.6022, lon: -117.9001, label: "Newport Beach" },
  "92663": { lat: 33.6275, lon: -117.9284, label: "Newport Beach" },
  "92677": { lat: 33.6267, lon: -117.7325, label: "Laguna Niguel" },
  "92679": { lat: 33.6007, lon: -117.7259, label: "Coto de Caza" },
  "92691": { lat: 33.6095, lon: -117.6934, label: "Mission Viejo" },
  "92692": { lat: 33.6120, lon: -117.6412, label: "Mission Viejo" },
  "92694": { lat: 33.5676, lon: -117.7256, label: "Ladera Ranch" },
  "92701": { lat: 33.7455, lon: -117.8677, label: "Santa Ana" },
  "92705": { lat: 33.7455, lon: -117.8262, label: "Santa Ana" },
  "92780": { lat: 33.7465, lon: -117.8171, label: "Tustin" },
  "92801": { lat: 33.8353, lon: -117.9145, label: "Anaheim" },
  "92804": { lat: 33.8185, lon: -117.9731, label: "Anaheim" },
  "92805": { lat: 33.8353, lon: -117.9145, label: "Anaheim" },
  "92806": { lat: 33.8353, lon: -117.9145, label: "Anaheim" },
  "92807": { lat: 33.8353, lon: -117.9145, label: "Anaheim" },
  "92808": { lat: 33.8353, lon: -117.9145, label: "Anaheim" },
  "92831": { lat: 33.8703, lon: -117.9242, label: "Fullerton" },
  "92835": { lat: 33.8703, lon: -117.9242, label: "Fullerton" },
  "92840": { lat: 33.7870, lon: -117.8531, label: "Garden Grove" },
  "92841": { lat: 33.7870, lon: -117.8531, label: "Garden Grove" },
  "92843": { lat: 33.7674, lon: -117.9401, label: "Garden Grove" },
  "92866": { lat: 33.7870, lon: -117.8531, label: "Orange" },
  "92867": { lat: 33.7870, lon: -117.8531, label: "Orange" },
  "92868": { lat: 33.7870, lon: -117.8531, label: "Orange" },
  "92869": { lat: 33.7870, lon: -117.8531, label: "Orange" },
};

function zipFromAddress(address: string): string | null {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? null;
}

export async function geocodeAddress(fullAddress: string): Promise<GeoPoint | null> {
  const key = fullAddress.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  const zip = zipFromAddress(fullAddress);
  if (zip && ZIP_FALLBACK[zip]) {
    const point = { ...ZIP_FALLBACK[zip], label: fullAddress };
    geocodeCache.set(key, point);
    return point;
  }

  let point: GeoPoint | null = null;
  try {
    point = await nominatimSearch(fullAddress);
    if (!point) {
      point = await nominatimSearch(`${fullAddress}, Orange County, CA`);
    }
  } catch {
    point = null;
  }

  if (!point) {
    const zip = zipFromAddress(fullAddress);
    if (zip && ZIP_FALLBACK[zip]) {
      point = { ...ZIP_FALLBACK[zip], label: fullAddress };
    }
  }

  geocodeCache.set(key, point);
  return point;
}
