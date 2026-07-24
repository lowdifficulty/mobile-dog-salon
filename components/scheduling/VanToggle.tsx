"use client";

import { VAN_IDS, vanLabel, type VanId } from "@/lib/scheduling/vans";

export default function VanToggle({
  selectedVan,
  onVanChange,
  lockedVan,
  vans,
}: {
  selectedVan: VanId;
  onVanChange: (van: VanId) => void;
  /** When set, only this van is shown (groomer is assigned to one van). */
  lockedVan?: VanId;
  /** Subset of vans to show (defaults to full fleet). */
  vans?: VanId[];
}) {
  const options = lockedVan ? [lockedVan] : (vans ?? VAN_IDS);

  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5">
      {options.map((van) => (
        <button
          key={van}
          type="button"
          onClick={() => !lockedVan && onVanChange(van)}
          disabled={Boolean(lockedVan)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            selectedVan === van
              ? "bg-brand text-white"
              : "text-brand hover:bg-gray-50"
          } ${lockedVan ? "cursor-default" : ""}`}
        >
          {vanLabel(van)}
        </button>
      ))}
    </div>
  );
}
