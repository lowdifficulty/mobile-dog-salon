import type { Appointment, GroomerId } from "./types";

export type VanId = "nissan" | "dodge";

export const VAN_IDS: VanId[] = ["nissan", "dodge"];

/** Fleet size — one appointment per van at a time. */
export const VAN_COUNT = VAN_IDS.length;

export const VANS: Record<
  VanId,
  { id: VanId; label: string; groomerId: GroomerId }
> = {
  nissan: { id: "nissan", label: "Nissan", groomerId: "melanie" },
  dodge: { id: "dodge", label: "Dodge", groomerId: "diamond" },
};

export function isVanId(value: string | null | undefined): value is VanId {
  return value === "nissan" || value === "dodge";
}

export function vanForGroomer(groomerId: GroomerId): VanId {
  return groomerId === "diamond" ? "dodge" : "nissan";
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
