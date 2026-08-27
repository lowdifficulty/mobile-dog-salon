import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { isStaffUpcomingAppointment } from "@/lib/scheduling/appointment-filters";
import { appointmentZipCentroid, type GeoPoint } from "@/lib/scheduling/geocode";
import {
  getGroomerHomeBase,
  getGroomerMaxDriveMiles,
} from "@/lib/scheduling/groomer-home-base";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

/** Road distance factor applied to straight-line miles (matches driving-estimates fallback). */
const ROAD_FACTOR = 1.35;

/** Appointments within this road-mile radius are grouped into one recommended route. */
export const TOO_FAR_CLUSTER_RADIUS_MILES = 6;

/** Minimum appointments in a geographic cluster to qualify as a recommended route. */
export const TOO_FAR_MIN_ROUTE_SIZE = 2;

export interface TooFarAppointmentEntry {
  id: string;
  groomerId: GroomerId;
  clientName: string;
  petName: string;
  address: string;
  city: string;
  zipCode: string;
  startAt: string;
  distanceMiles: number;
  maxMiles: number;
  homeBaseLabel: string;
  estimateSource: "zip-centroid";
}

export interface TooFarRecommendedRoute {
  id: string;
  groomerId: GroomerId;
  /** Human-readable area label, e.g. "Laguna Niguel (92677)". */
  areaLabel: string;
  appointmentCount: number;
  /** Number of distinct calendar days spanned by visits in this cluster. */
  uniqueDays: number;
  /** Max road-mile distance between any two stops in the cluster. */
  clusterSpreadMiles: number;
  appointments: TooFarAppointmentEntry[];
}

export interface TooFarScanMeta {
  checked: number;
  flagged: number;
  unlocated: number;
  routeCount: number;
  isolatedCount: number;
}

export interface TooFarGroupedResult {
  /** Clusters of 2+ nearby too-far visits — consolidation opportunities. */
  routes: TooFarRecommendedRoute[];
  /** Single too-far visits with no nearby peers to combine. */
  isolated: TooFarAppointmentEntry[];
  /** Flat list of all flagged entries (routes + isolated), sorted by startAt. */
  tooFar: TooFarAppointmentEntry[];
  meta: TooFarScanMeta;
}

interface InternalTooFarEntry extends TooFarAppointmentEntry {
  point: GeoPoint;
}

function roadMilesBetween(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const straight = 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  return straight * ROAD_FACTOR;
}

function groomerHomePoint(groomerId: GroomerId): GeoPoint {
  const homeBase = getGroomerHomeBase(groomerId);
  return {
    lat: homeBase.lat,
    lon: homeBase.lon,
    label: homeBase.fullAddress,
    precision: "zip",
  };
}

/** Confirmed, not closed out, scheduled today or later. */
export function isTooFarScanCandidate(
  appointment: Appointment,
  now: Date = new Date()
): boolean {
  return isStaffUpcomingAppointment(appointment, now);
}

function areaLabelForCluster(entries: TooFarAppointmentEntry[]): string {
  const zipCounts = new Map<string, number>();
  const cityCounts = new Map<string, number>();
  for (const entry of entries) {
    const zip = entry.zipCode.trim();
    if (zip) zipCounts.set(zip, (zipCounts.get(zip) ?? 0) + 1);
    const city = entry.city.trim();
    if (city) cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }

  let bestZip = entries[0]?.zipCode.trim() ?? "";
  let bestZipCount = 0;
  for (const [zip, count] of zipCounts) {
    if (count > bestZipCount) {
      bestZipCount = count;
      bestZip = zip;
    }
  }

  let bestCity = entries[0]?.city.trim() ?? "";
  let bestCityCount = 0;
  for (const [city, count] of cityCounts) {
    if (count > bestCityCount) {
      bestCityCount = count;
      bestCity = city;
    }
  }

  if (bestCity && bestZip) return `${bestCity} (${bestZip})`;
  if (bestZip) return `${bestZip} area`;
  if (bestCity) return `${bestCity} area`;
  return "Nearby area";
}

function clusterSpreadMiles(entries: InternalTooFarEntry[]): number {
  if (entries.length < 2) return 0;
  let maxMiles = 0;
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      maxMiles = Math.max(maxMiles, roadMilesBetween(entries[i].point, entries[j].point));
    }
  }
  return Math.round(maxMiles * 10) / 10;
}

function uniqueDayCount(entries: TooFarAppointmentEntry[]): number {
  const days = new Set(
    entries.map((e) =>
      new Date(e.startAt).toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })
    )
  );
  return days.size;
}

function clusterByProximity(
  entries: InternalTooFarEntry[],
  radiusMiles: number
): InternalTooFarEntry[][] {
  const n = entries.length;
  if (n === 0) return [];

  const parent = entries.map((_, index) => index);
  const find = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };
  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootA] = rootB;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (roadMilesBetween(entries[i].point, entries[j].point) <= radiusMiles) {
        union(i, j);
      }
    }
  }

  const groups = new Map<number, InternalTooFarEntry[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const group = groups.get(root);
    if (group) group.push(entries[i]);
    else groups.set(root, [entries[i]]);
  }

  return [...groups.values()];
}

function buildRecommendedRoutes(
  entries: InternalTooFarEntry[],
  options?: { clusterRadiusMiles?: number; minRouteSize?: number }
): { routes: TooFarRecommendedRoute[]; isolated: TooFarAppointmentEntry[] } {
  const clusterRadiusMiles = options?.clusterRadiusMiles ?? TOO_FAR_CLUSTER_RADIUS_MILES;
  const minRouteSize = options?.minRouteSize ?? TOO_FAR_MIN_ROUTE_SIZE;

  const routes: TooFarRecommendedRoute[] = [];
  const isolated: TooFarAppointmentEntry[] = [];

  const byGroomer = new Map<GroomerId, InternalTooFarEntry[]>();
  for (const entry of entries) {
    const groomerEntries = byGroomer.get(entry.groomerId);
    if (groomerEntries) groomerEntries.push(entry);
    else byGroomer.set(entry.groomerId, [entry]);
  }

  for (const [groomerId, groomerEntries] of byGroomer) {
    const clusters = clusterByProximity(groomerEntries, clusterRadiusMiles);
    let routeIndex = 0;

    for (const cluster of clusters) {
      const publicEntries = cluster.map(({ point: _point, ...rest }) => rest);
      publicEntries.sort((a, b) => a.startAt.localeCompare(b.startAt));

      if (cluster.length >= minRouteSize) {
        const areaLabel = areaLabelForCluster(publicEntries);
        routeIndex += 1;
        routes.push({
          id: `${groomerId}-${areaLabel.replace(/\W+/g, "-").toLowerCase()}-${routeIndex}`,
          groomerId,
          areaLabel,
          appointmentCount: publicEntries.length,
          uniqueDays: uniqueDayCount(publicEntries),
          clusterSpreadMiles: clusterSpreadMiles(cluster),
          appointments: publicEntries,
        });
      } else {
        isolated.push(...publicEntries);
      }
    }
  }

  routes.sort((a, b) => {
    const groomerCmp = a.groomerId.localeCompare(b.groomerId);
    if (groomerCmp !== 0) return groomerCmp;
    return a.appointments[0].startAt.localeCompare(b.appointments[0].startAt);
  });
  isolated.sort((a, b) => a.startAt.localeCompare(b.startAt));

  return { routes, isolated };
}

export function listTooFarAppointments(
  appointments: Appointment[],
  options?: {
    groomerId?: GroomerId;
    now?: Date;
    clusterRadiusMiles?: number;
    minRouteSize?: number;
  }
): TooFarGroupedResult {
  const now = options?.now ?? new Date();
  let candidates = appointments.filter((a) => isTooFarScanCandidate(a, now));
  if (options?.groomerId) {
    candidates = candidates.filter((a) => a.groomerId === options.groomerId);
  }

  const internalResults: InternalTooFarEntry[] = [];
  let unlocated = 0;

  for (const ap of candidates) {
    const maxMiles = getGroomerMaxDriveMiles(ap.groomerId);
    const homeBase = getGroomerHomeBase(ap.groomerId);
    const fullAddress = formatAppointmentAddress(ap);

    const appointmentPoint = appointmentZipCentroid({
      address: ap.address,
      city: ap.city,
      zipCode: ap.zipCode,
      fullAddress,
    });
    if (!appointmentPoint) {
      unlocated += 1;
      continue;
    }

    const basePoint = groomerHomePoint(ap.groomerId);
    const miles = roadMilesBetween(basePoint, appointmentPoint);
    if (miles <= maxMiles) continue;

    internalResults.push({
      id: ap.id,
      groomerId: ap.groomerId,
      clientName: `${ap.firstName} ${ap.lastName}`.trim(),
      petName: ap.petName?.trim() || "your pet",
      address: fullAddress,
      city: ap.city.trim(),
      zipCode: ap.zipCode.trim(),
      startAt: ap.startAt,
      distanceMiles: Math.round(miles * 10) / 10,
      maxMiles,
      homeBaseLabel: homeBase.label,
      estimateSource: "zip-centroid",
      point: appointmentPoint,
    });
  }

  const { routes, isolated } = buildRecommendedRoutes(internalResults, {
    clusterRadiusMiles: options?.clusterRadiusMiles,
    minRouteSize: options?.minRouteSize,
  });

  const tooFar = [...routes.flatMap((route) => route.appointments), ...isolated].sort((a, b) =>
    a.startAt.localeCompare(b.startAt)
  );

  return {
    routes,
    isolated,
    tooFar,
    meta: {
      checked: candidates.length,
      flagged: tooFar.length,
      unlocated,
      routeCount: routes.length,
      isolatedCount: isolated.length,
    },
  };
}
