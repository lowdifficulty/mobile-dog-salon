import type { GroomerId } from "./types";
import { GROOMERS } from "./groomers";

export function groomerAccentClasses(groomerId: GroomerId): string {
  if (groomerId === "melanie") {
    return "border-emerald-300 bg-emerald-100 text-emerald-950";
  }
  if (groomerId === "jessica") {
    return "border-blue-300 bg-blue-100 text-blue-950";
  }
  if (groomerId === "diamond") {
    return "border-violet-300 bg-violet-100 text-violet-950";
  }
  return "border-gray-200 bg-white text-gray-900";
}

export function groomerAppointmentCardClass(
  groomerId: GroomerId,
  options: { isOwn: boolean; cancelled: boolean; colorByGroomer: boolean }
): string {
  if (options.cancelled) return "border-gray-200 bg-gray-50/70 opacity-75 text-gray-700";
  if (!options.colorByGroomer) return "border-gray-200 bg-white text-gray-900";
  if (groomerId === "melanie") {
    return "border-emerald-400 bg-emerald-100 text-emerald-950";
  }
  if (groomerId === "jessica") {
    return "border-blue-400 bg-blue-100 text-blue-950";
  }
  if (groomerId === "diamond") {
    return "border-violet-400 bg-violet-100 text-violet-950";
  }
  return groomerAccentClasses(groomerId);
}

export function groomerAppointmentLegendLabel(groomerId: GroomerId): string {
  return GROOMERS[groomerId].name;
}

export function groomerAppointmentLegendDotClass(groomerId: GroomerId): string {
  if (groomerId === "melanie") return "bg-emerald-600";
  if (groomerId === "jessica") return "bg-blue-600";
  if (groomerId === "diamond") return "bg-violet-600";
  return "bg-gray-400";
}

export function groomerAppointmentLeftBorderClass(groomerId: GroomerId): string {
  if (groomerId === "melanie") return "border-l-emerald-600";
  if (groomerId === "jessica") return "border-l-blue-600";
  if (groomerId === "diamond") return "border-l-violet-600";
  return "border-l-gray-400";
}

export function groomerConversationAvatarClass(
  groomerId: "melanie" | "jessica" | "diamond" | null | undefined
): string {
  if (groomerId === "melanie") return "bg-emerald-600 text-white";
  if (groomerId === "jessica") return "bg-blue-600 text-white";
  if (groomerId === "diamond") return "bg-violet-600 text-white";
  return "bg-brand text-white";
}

export function groomerConversationRowClass(
  groomerId: "melanie" | "jessica" | "diamond" | null | undefined,
  active: boolean
): string {
  if (groomerId === "melanie") {
    return active
      ? "bg-emerald-50 border-l-4 border-l-emerald-500"
      : "hover:bg-emerald-50/70 border-l-4 border-l-emerald-300";
  }
  if (groomerId === "jessica") {
    return active
      ? "bg-blue-50 border-l-4 border-l-blue-500"
      : "hover:bg-blue-50/70 border-l-4 border-l-blue-300";
  }
  return active ? "bg-[#eef6ff]" : "hover:bg-[#f8fafc] border-l-4 border-l-transparent";
}
