"use client";

import { useState } from "react";
import AvailabilityEditor from "./AvailabilityEditor";
import { vanForGroomer } from "@/lib/scheduling/vans";
import type { GroomerId } from "@/lib/scheduling/types";
import type { VanId } from "@/lib/scheduling/vans";

export default function GroomerShiftsTab({ groomerId }: { groomerId: GroomerId }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const lockedVan: VanId = vanForGroomer(groomerId);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        Each groomer has a dedicated van and territory. Pick the days and times you want to work — no
        need to reserve a shared van slot.
      </p>
      <AvailabilityEditor
        apiBase="/api/groomer/availability"
        groomerId={groomerId}
        selectedVan={lockedVan}
        onVanChange={() => {}}
        lockedVan={lockedVan}
        refreshKey={refreshKey}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
