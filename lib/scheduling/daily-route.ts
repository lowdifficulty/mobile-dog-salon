import { formatAppointmentTitle } from "@/lib/booking/appointment-title";
import { formatPetNames, getAppointmentPets } from "@/lib/booking/pets";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { geocodeAppointmentAddress, geocodeAddress } from "@/lib/scheduling/geocode";
import { estimateDrivingLeg, fetchDrivingRoutePath } from "@/lib/scheduling/driving-estimates";
import {
  ROUTE_DEPOT,
  ROUTE_GALLONS_PER_APPOINTMENT,
  ROUTE_GAS_MPG,
  ROUTE_GAS_PRICE_PER_GALLON,
} from "@/lib/scheduling/route-depot";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";
import { buildGoogleMapsEmbedUrl } from "@/lib/scheduling/google-maps-route-map";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

const PACIFIC_TZ = "America/Los_Angeles";

export interface RouteLegEstimate {
  fromLabel: string;
  toLabel: string;
  distanceMiles: number;
  durationMinutes: number;
  estimateSource: "osrm" | "estimate";
  approximateLocation?: boolean;
}

export interface DailyRouteStop {
  appointmentId: string;
  order: number;
  startAt: string;
  displayTime: string;
  clientName: string;
  appointmentTitle: string;
  petSummary: string;
  addressLine: string;
  fullAddress: string;
  leg: RouteLegEstimate;
}

export interface RouteMapPoint {
  lat: number;
  lon: number;
  label: string;
  kind: "depot" | "stop";
  order?: number;
}

export interface DailyRoutePlan {
  date: string;
  groomerId: GroomerId;
  depotAddress: string;
  stops: DailyRouteStop[];
  returnLeg: RouteLegEstimate;
  mapPoints: RouteMapPoint[];
  routePath: { lat: number; lon: number }[];
  totalDriveMiles: number;
  totalDriveMinutes: number;
  appointmentCount: number;
  gallonsDriving: number;
  gallonsAppointmentUse: number;
  totalGallons: number;
  gasPricePerGallon: number;
  totalGasCost: number;
  googleMapsUrl: string;
  googleMapsEmbedUrl: string | null;
  usesEstimates: boolean;
}

export function appointmentPacificDate(startAt: string): string {
  return new Date(startAt).toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
}

export function formatRouteStopTime(startAt: string): string {
  return new Date(startAt).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: PACIFIC_TZ,
  });
}

export function listGroomerScheduledDates(
  appointments: Appointment[],
  groomerId: GroomerId,
  fromDate?: string
): string[] {
  const minDate = fromDate ?? getTodayPacificDate();
  const dates = new Set<string>();
  for (const ap of appointments) {
    if (ap.groomerId !== groomerId || ap.status !== "confirmed") continue;
    const date = appointmentPacificDate(ap.startAt);
    if (date >= minDate) dates.add(date);
  }
  return [...dates].sort();
}

function buildGoogleMapsDirectionsUrl(addresses: string[]): string {
  const path = addresses.map((addr) => encodeURIComponent(addr)).join("/");
  return `https://www.google.com/maps/dir/${path}`;
}

export async function buildDailyRoutePlan(
  appointments: Appointment[],
  groomerId: GroomerId,
  date: string
): Promise<DailyRoutePlan | null> {
  const dayAppointments = appointments
    .filter(
      (ap) =>
        ap.groomerId === groomerId &&
        ap.status === "confirmed" &&
        appointmentPacificDate(ap.startAt) === date
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  if (dayAppointments.length === 0) return null;

  const depotPoint = await geocodeAddress(ROUTE_DEPOT.fullAddress);
  if (!depotPoint) {
    throw new Error("Could not locate depot address for routing.");
  }

  const stops: DailyRouteStop[] = [];
  const routeWaypoints = [depotPoint];
  let totalDriveMiles = 0;
  let totalDriveMinutes = 0;
  let usesEstimates = false;
  let previousPoint = depotPoint;
  let previousLabel: string = ROUTE_DEPOT.label;

  for (let i = 0; i < dayAppointments.length; i++) {
    const ap = dayAppointments[i];
    const fullAddress = formatAppointmentAddress(ap);
    const destPoint = await geocodeAppointmentAddress({
      address: ap.address,
      city: ap.city,
      zipCode: ap.zipCode,
      fullAddress,
    });
    routeWaypoints.push(destPoint);
    const approximateLocation = destPoint.precision === "zip";
    if (approximateLocation) usesEstimates = true;

    const legResult = await estimateDrivingLeg(previousPoint, destPoint);
    if (legResult.source === "estimate") usesEstimates = true;

    const leg: RouteLegEstimate = {
      fromLabel: previousLabel,
      toLabel: `${ap.firstName} ${ap.lastName}`.trim() || "Appointment",
      distanceMiles: legResult.miles,
      durationMinutes: legResult.minutes,
      estimateSource: legResult.source,
      approximateLocation,
    };

    totalDriveMiles += leg.distanceMiles;
    totalDriveMinutes += leg.durationMinutes;

    stops.push({
      appointmentId: ap.id,
      order: i + 1,
      startAt: ap.startAt,
      displayTime: formatRouteStopTime(ap.startAt),
      clientName: `${ap.firstName} ${ap.lastName}`.trim() || "Guest",
      appointmentTitle: formatAppointmentTitle(ap),
      petSummary: formatPetNames(getAppointmentPets(ap)),
      addressLine: `${ap.address}, ${ap.city}`,
      fullAddress,
      leg,
    });

    previousPoint = destPoint;
    previousLabel = leg.toLabel;
  }

  const returnLegResult = await estimateDrivingLeg(previousPoint, depotPoint);
  if (returnLegResult.source === "estimate") usesEstimates = true;

  const returnLeg: RouteLegEstimate = {
    fromLabel: previousLabel,
    toLabel: ROUTE_DEPOT.label,
    distanceMiles: returnLegResult.miles,
    durationMinutes: returnLegResult.minutes,
    estimateSource: returnLegResult.source,
  };

  totalDriveMiles += returnLeg.distanceMiles;
  totalDriveMinutes += returnLeg.durationMinutes;

  routeWaypoints.push(depotPoint);

  const mapPoints: RouteMapPoint[] = [
    {
      lat: depotPoint.lat,
      lon: depotPoint.lon,
      label: ROUTE_DEPOT.label,
      kind: "depot",
    },
    ...stops.map((stop, index) => ({
      lat: routeWaypoints[index + 1].lat,
      lon: routeWaypoints[index + 1].lon,
      label: stop.clientName,
      kind: "stop" as const,
      order: stop.order,
    })),
  ];

  const routePathResult = await fetchDrivingRoutePath(routeWaypoints);
  if (routePathResult.source === "estimate") usesEstimates = true;

  const appointmentCount = stops.length;
  const gallonsDriving = totalDriveMiles / ROUTE_GAS_MPG;
  const gallonsAppointmentUse = appointmentCount * ROUTE_GALLONS_PER_APPOINTMENT;
  const totalGallons = gallonsDriving + gallonsAppointmentUse;
  const gasPricePerGallon = ROUTE_GAS_PRICE_PER_GALLON;
  const totalGasCost = totalGallons * gasPricePerGallon;

  const mapAddresses = [
    ROUTE_DEPOT.fullAddress,
    ...stops.map((s) => s.fullAddress),
    ROUTE_DEPOT.fullAddress,
  ];
  const stopAddresses = stops.map((s) => s.fullAddress);
  const googleMapsEmbedUrl = buildGoogleMapsEmbedUrl(ROUTE_DEPOT.fullAddress, stopAddresses);

  return {
    date,
    groomerId,
    depotAddress: ROUTE_DEPOT.fullAddress,
    stops,
    returnLeg,
    mapPoints,
    routePath: routePathResult.path,
    totalDriveMiles,
    totalDriveMinutes,
    appointmentCount,
    gallonsDriving,
    gallonsAppointmentUse,
    totalGallons,
    gasPricePerGallon,
    totalGasCost,
    googleMapsUrl: buildGoogleMapsDirectionsUrl(mapAddresses),
    googleMapsEmbedUrl,
    usesEstimates,
  };
}
