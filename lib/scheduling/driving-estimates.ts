import type { GeoPoint } from "./geocode";

const ROAD_FACTOR = 1.35;
const FALLBACK_SPEED_MPH = 28;

function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function fallbackLeg(a: GeoPoint, b: GeoPoint): { miles: number; minutes: number } {
  const miles = haversineMiles(a, b) * ROAD_FACTOR;
  const minutes = (miles / FALLBACK_SPEED_MPH) * 60;
  return { miles, minutes };
}

async function osrmLeg(a: GeoPoint, b: GeoPoint): Promise<{ miles: number; minutes: number } | null> {
  const coords = `${a.lon},${a.lat};${b.lon},${b.lat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { distance: number; duration: number }[];
    };
    const route = data.routes?.[0];
    if (!route) return null;
    return {
      miles: route.distance / 1609.344,
      minutes: route.duration / 60,
    };
  } catch {
    return null;
  }
}

export async function estimateDrivingLeg(
  from: GeoPoint,
  to: GeoPoint
): Promise<{ miles: number; minutes: number; source: "osrm" | "estimate" }> {
  const osrm = await osrmLeg(from, to);
  if (osrm) {
    return { ...osrm, source: "osrm" };
  }
  const est = fallbackLeg(from, to);
  return { ...est, source: "estimate" };
}

export async function fetchDrivingRoutePath(
  points: GeoPoint[]
): Promise<{ path: { lat: number; lon: number }[]; source: "osrm" | "estimate" }> {
  if (points.length < 2) {
    return {
      path: points.map((point) => ({ lat: point.lat, lon: point.lon })),
      source: "estimate",
    };
  }

  const coords = points.map((point) => `${point.lon},${point.lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error("OSRM route failed");
    const data = (await res.json()) as {
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
    };
    const coordinates = data.routes?.[0]?.geometry?.coordinates;
    if (!coordinates?.length) throw new Error("OSRM route empty");
    return {
      path: coordinates.map(([lon, lat]) => ({ lat, lon })),
      source: "osrm",
    };
  } catch {
    return {
      path: points.map((point) => ({ lat: point.lat, lon: point.lon })),
      source: "estimate",
    };
  }
}
