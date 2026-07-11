"use client";

import { useState } from "react";
import AvailabilityEditor from "./AvailabilityEditor";
import { GROOMERS } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";

const GROOMER_IDS = Object.keys(GROOMERS) as GroomerId[];

export default function StaffShiftsPanel({
  apiBase = "/api/admin/availability",
  defaultGroomerId = "melanie",
}: {
  apiBase?: string;
  defaultGroomerId?: GroomerId;
}) {
  const [groomerId, setGroomerId] = useState<GroomerId>(defaultGroomerId);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand">Shifts</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose which 3-hour shifts each groomer works — any day of the week, up to 3 months
            ahead. Shifts: 8 AM, 11 AM, 2 PM, 5 PM.
          </p>
        </div>
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">
            Groomer
          </span>
          <select
            value={groomerId}
            onChange={(e) => setGroomerId(e.target.value as GroomerId)}
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
      />
    </div>
  );
}
