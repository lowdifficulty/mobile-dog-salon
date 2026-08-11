import type { GroomerId } from "./types";
import { GROOMERS } from "./groomers";

export function groomerAccentClasses(groomerId: GroomerId): string {
  if (groomerId === "melanie") return "border-emerald-400/80 bg-emerald-50/50";
  if (groomerId === "jessica") return "border-blue-400/80 bg-blue-50/50";
  if (groomerId === "diamond") return "border-violet-400/80 bg-violet-50/50";
  return "border-gray-200 bg-white";
}

export function groomerAppointmentCardClass(
  groomerId: GroomerId,
  options: { isOwn: boolean; cancelled: boolean; colorByGroomer: boolean }
): string {
  if (options.cancelled) return "border-gray-200 bg-gray-50/70 opacity-75";
  if (!options.colorByGroomer) return "border-gray-200 bg-white";
  return groomerAccentClasses(groomerId);
}

export function groomerAppointmentLegendLabel(groomerId: GroomerId): string {
  return GROOMERS[groomerId].name;
}

export function groomerAppointmentLegendDotClass(groomerId: GroomerId): string {
  if (groomerId === "melanie") return "bg-emerald-500";
  if (groomerId === "jessica") return "bg-blue-500";
  if (groomerId === "diamond") return "bg-violet-500";
  return "bg-gray-400";
}
