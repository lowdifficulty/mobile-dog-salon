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

export interface TooFarAppointmentEntry {
  id: string;
  groomerId: GroomerId;
  clientName: string;
  petName: string;
  address: string;
  startAt: string;
  distanceMiles: number;
  maxMiles: number;
  homeBaseLabel: string;
  estimateSource: "zip-centroid";
}

export interface TooFarScanMeta {
  checked: number;
  flagged: number;
  unlocated: number;
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

export function listTooFarAppointments(
  appointments: Appointment[],
  options?: { groomerId?: GroomerId; now?: Date }
): { tooFar: TooFarAppointmentEntry[]; meta: TooFarScanMeta } {
  const now = options?.now ?? new Date();
  let candidates = appointments.filter((a) => isStaffUpcomingAppointment(a, now));
  if (options?.groomerId) {
    candidates = candidates.filter((a) => a.groomerId === options.groomerId);
  }

  const results: TooFarAppointmentEntry[] = [];
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

    results.push({
      id: ap.id,
      groomerId: ap.groomerId,
      clientName: `${ap.firstName} ${ap.lastName}`.trim(),
      petName: ap.petName?.trim() || "your pet",
      address: fullAddress,
      startAt: ap.startAt,
      distanceMiles: Math.round(miles * 10) / 10,
      maxMiles,
      homeBaseLabel: homeBase.label,
      estimateSource: "zip-centroid",
    });
  }

  return {
    tooFar: results.sort((a, b) => a.startAt.localeCompare(b.startAt)),
    meta: {
      checked: candidates.length,
      flagged: results.length,
      unlocated,
    },
  };
}
