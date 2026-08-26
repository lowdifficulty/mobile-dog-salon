import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { estimateDrivingLeg } from "@/lib/scheduling/driving-estimates";
import { isStaffUpcomingAppointment } from "@/lib/scheduling/appointment-filters";
import {
  geocodeAddress,
  geocodeAppointmentAddress,
  type GeoPoint,
} from "@/lib/scheduling/geocode";
import {
  getGroomerHomeBase,
  getGroomerMaxDriveMiles,
} from "@/lib/scheduling/groomer-home-base";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

export interface TooFarAppointmentEntry {
  id: string;
  groomerId: GroomerId;
  clientName: string;
  address: string;
  startAt: string;
  distanceMiles: number;
  maxMiles: number;
  homeBaseLabel: string;
  estimateSource: "osrm" | "estimate";
  appointment: Appointment;
}

const homeBaseCache = new Map<GroomerId, GeoPoint>();

async function groomerHomePoint(groomerId: GroomerId): Promise<GeoPoint> {
  const cached = homeBaseCache.get(groomerId);
  if (cached) return cached;

  const homeBase = getGroomerHomeBase(groomerId);
  const point = await geocodeAddress(homeBase.fullAddress);
  homeBaseCache.set(groomerId, point);
  return point;
}

export async function listTooFarAppointments(
  appointments: Appointment[],
  options?: { groomerId?: GroomerId; now?: Date }
): Promise<TooFarAppointmentEntry[]> {
  const now = options?.now ?? new Date();
  let candidates = appointments.filter((a) => isStaffUpcomingAppointment(a, now));
  if (options?.groomerId) {
    candidates = candidates.filter((a) => a.groomerId === options.groomerId);
  }

  const results: TooFarAppointmentEntry[] = [];

  for (const ap of candidates) {
    const maxMiles = getGroomerMaxDriveMiles(ap.groomerId);
    const homeBase = getGroomerHomeBase(ap.groomerId);
    const fullAddress = formatAppointmentAddress(ap);

    let appointmentPoint: GeoPoint;
    try {
      appointmentPoint = await geocodeAppointmentAddress({
        address: ap.address,
        city: ap.city,
        zipCode: ap.zipCode,
        fullAddress,
      });
    } catch {
      continue;
    }

    const basePoint = await groomerHomePoint(ap.groomerId);
    const leg = await estimateDrivingLeg(basePoint, appointmentPoint);
    if (leg.miles <= maxMiles) continue;

    results.push({
      id: ap.id,
      groomerId: ap.groomerId,
      clientName: `${ap.firstName} ${ap.lastName}`.trim(),
      address: fullAddress,
      startAt: ap.startAt,
      distanceMiles: Math.round(leg.miles * 10) / 10,
      maxMiles,
      homeBaseLabel: homeBase.label,
      estimateSource: leg.source,
      appointment: ap,
    });
  }

  return results.sort((a, b) => a.startAt.localeCompare(b.startAt));
}
