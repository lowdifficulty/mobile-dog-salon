import type { GroomerId } from "@/lib/scheduling/types";

export const GROOMER_ACCOUNTING_IDS: GroomerId[] = ["jessica", "melanie"];

export function groomerHasAccounting(groomerId: GroomerId): boolean {
  return GROOMER_ACCOUNTING_IDS.includes(groomerId);
}
