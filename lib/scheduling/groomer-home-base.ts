import type { GroomerId } from "./types";
import { ROUTE_DEPOT } from "./route-depot";

export interface GroomerHomeBase {
  label: string;
  fullAddress: string;
  /**
   * One-way max driving miles from this groomer's start point before an upcoming
   * appointment is flagged on the "Too Far Please Review" tab.
   */
  maxDriveMiles: number;
}

/** Jessica starts in Anaheim; Melanie in Garden Grove; Diamond uses the depot. */
export const GROOMER_HOME_BASES: Record<GroomerId, GroomerHomeBase> = {
  jessica: {
    label: "Jessica home base (Anaheim, CA)",
    fullAddress: "Anaheim, CA",
    maxDriveMiles: 8,
  },
  melanie: {
    label: "Melanie home base (Garden Grove, CA)",
    fullAddress: "Garden Grove, CA",
    maxDriveMiles: 8,
  },
  diamond: {
    label: "Diamond home base (depot)",
    fullAddress: ROUTE_DEPOT.fullAddress,
    maxDriveMiles: 8,
  },
};

export function getGroomerHomeBase(groomerId: GroomerId): GroomerHomeBase {
  return GROOMER_HOME_BASES[groomerId];
}

export function getGroomerMaxDriveMiles(groomerId: GroomerId): number {
  return GROOMER_HOME_BASES[groomerId].maxDriveMiles;
}
