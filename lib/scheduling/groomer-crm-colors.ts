import type { GroomerId } from "./types";
import { GROOMERS } from "./groomers";

export function groomerAppointmentCardClass(
  groomerId: GroomerId,
  options: { isOwn: boolean; cancelled: boolean; colorByGroomer: boolean }
): string {
  if (options.cancelled) return "border-gray-300 opacity-80";
  if (!options.colorByGroomer) return "border-accent";

  if (options.isOwn) return "border-green-500 bg-green-50";

  if (groomerId === "diamond") return "border-blue-500 bg-blue-50";
  if (groomerId === "jessica") return "border-purple-500 bg-purple-50";

  return "border-accent bg-accent-light/50";
}

export function groomerAppointmentLegendLabel(groomerId: GroomerId): string {
  return `${GROOMERS[groomerId].name}'s appointments`;
}

export function groomerAppointmentLegendDotClass(groomerId: GroomerId): string {
  if (groomerId === "diamond") return "bg-blue-500";
  if (groomerId === "jessica") return "bg-purple-500";
  return "bg-accent";
}
