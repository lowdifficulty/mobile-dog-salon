import type { Appointment, AvailabilityDay, GroomerId } from "./types";
import { getTodayPacificDate } from "./slots";

export type VanId = "nissan" | "dodge" | "ford";

export const VAN_IDS: VanId[] = ["nissan", "dodge", "ford"];

/** Fleet size — one appointment per van at a time. */
export const VAN_COUNT = VAN_IDS.length;

/** Ford van joins the fleet on this date (Pacific, YYYY-MM-DD). */
export const FORD_VAN_EFFECTIVE_FROM = "2026-07-23";

export const VANS: Record<
  VanId,
  { id: VanId; label: string; groomerId: GroomerId }
> = {
  nissan: { id: "nissan", label: "Nissan", groomerId: "melanie" },
  dodge: { id: "dodge", label: "Dodge", groomerId: "diamond" },
  ford: { id: "ford", label: "Ford", groomerId: "jessica" },
};

export function isVanId(value: string | null | undefined): value is VanId {
  return value === "nissan" || value === "dodge" || value === "ford";
}

export function isVanActiveOnDate(vanId: VanId, date: string): boolean {
  if (vanId === "ford") return date >= FORD_VAN_EFFECTIVE_FROM;
  return true;
}

export function vanForGroomer(groomerId: GroomerId): VanId {
  if (groomerId === "diamond") return "dodge";
  if (groomerId === "jessica") return "ford";
  return "nissan";
}

/** Groomers whose shifts count against this van's capacity. */
export function groomersForVan(vanId: VanId): GroomerId[] {
  if (vanId === "nissan") return ["melanie", "jessica"];
  if (vanId === "ford") return ["jessica"];
  return ["diamond", "jessica"];
}

export function groomerCanReserveVan(groomerId: GroomerId, vanId: VanId): boolean {
  return groomersForVan(vanId).includes(groomerId);
}

/** Vans a groomer may claim shifts on in the shift editor. */
export function selectableVansForGroomer(
  groomerId: GroomerId,
  asOfDate: string = getTodayPacificDate()
): VanId[] {
  return VAN_IDS.filter(
    (vanId) =>
      groomerCanReserveVan(groomerId, vanId) && isVanActiveOnDate(vanId, asOfDate)
  );
}

export function activeVansOnDate(date: string): VanId[] {
  return VAN_IDS.filter((vanId) => isVanActiveOnDate(vanId, date));
}

export function groomerHasMultiVanAccess(groomerId: GroomerId): boolean {
  return groomerId === "jessica";
}

export function availabilityVan(day: AvailabilityDay): VanId {
  return day.van ?? vanForGroomer(day.groomerId);
}

export function groomerForVan(vanId: VanId): GroomerId {
  return VANS[vanId].groomerId;
}

export function vanLabel(vanId: VanId): string {
  return VANS[vanId].label;
}

/** Resolve van from appointment field or groomer assignment. */
export function appointmentVan(ap: Appointment): VanId {
  return ap.van ?? vanForGroomer(ap.groomerId);
}

export function normalizeAppointmentVan(ap: Appointment): Appointment {
  const van = appointmentVan(ap);
  if (ap.van === van) return ap;
  return { ...ap, van };
}
