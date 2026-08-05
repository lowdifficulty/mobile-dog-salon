"use client";

import { useState } from "react";
import AvailabilityEditor from "./AvailabilityEditor";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { vanForGroomer } from "@/lib/scheduling/vans";
import type { GroomerId } from "@/lib/scheduling/types";
import type { VanId } from "@/lib/scheduling/vans";

const GROOMER_IDS = Object.keys(GROOMERS) as GroomerId[];

export default function StaffShiftsPanel({
  apiBase = "/api/admin/availability",
  defaultGroomerId = "melanie",
}: {
  apiBase?: string;
  defaultGroomerId?: GroomerId;
}) {
  const [groomerId, setGroomerId] = useState<GroomerId>(defaultGroomerId);
  const lockedVan: VanId = vanForGroomer(groomerId);
  const [overviewKey, setOverviewKey] = useState(0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand">Groomer hours</h2>
          <p className="text-sm text-gray-500 mt-1">
            Each groomer has their own van. Choose a groomer, tap days on the calendar, select
            working times, and save. Diamond&apos;s account stays active while she&apos;s away — she
            won&apos;t appear on public booking.
          </p>
        </div>
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
            Groomer
          </span>
          <select
            value={groomerId}
            onChange={(e) => {
              const id = e.target.value as GroomerId;
              setGroomerId(id);
              setOverviewKey((k) => k + 1);
            }}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand"
          >
            {GROOMER_IDS.map((id) => (
              <option key={id} value={id}>
                {GROOMERS[id].name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <AvailabilityEditor
        key={groomerId}
        apiBase={`${apiBase}?groomerId=${groomerId}&edit=1`}
        groomerId={groomerId}
        includeGroomerIdInSave
        selectedVan={lockedVan}
        onVanChange={() => {}}
        lockedVan={lockedVan}
        refreshKey={overviewKey}
        onSaved={() => setOverviewKey((k) => k + 1)}
      />
    </div>
  );
}
