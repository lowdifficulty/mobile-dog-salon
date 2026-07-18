"use client";

import { VAN_IDS, vanLabel, type VanId } from "@/lib/scheduling/vans";

export default function VanToggle({
  selectedVan,
  onVanChange,
}: {
  selectedVan: VanId;
  onVanChange: (van: VanId) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5">
      {VAN_IDS.map((van) => (
        <button
          key={van}
          type="button"
          onClick={() => onVanChange(van)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            selectedVan === van
              ? "bg-brand text-white"
              : "text-brand hover:bg-gray-50"
          }`}
        >
          {vanLabel(van)}
        </button>
      ))}
    </div>
  );
}
