"use client";

import { useState } from "react";
import AppointmentList from "./AppointmentList";
import type { GroomerId } from "@/lib/scheduling/types";
import type { StaffAppointmentFilter } from "@/lib/scheduling/appointment-filters";

const BASE_SUBTABS: { id: StaffAppointmentFilter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
];

const RECENT_SUBTAB: { id: StaffAppointmentFilter; label: string } = {
  id: "recent",
  label: "Most recent",
};

export default function StaffAppointmentsPanel({
  apiUrl,
  currentGroomerId,
  allowOverrideAvailability = false,
  allowDelete = false,
  showRecentFilter = false,
  refreshKey = 0,
  colorByGroomer = false,
}: {
  apiUrl: string;
  currentGroomerId?: GroomerId;
  allowOverrideAvailability?: boolean;
  allowDelete?: boolean;
  showRecentFilter?: boolean;
  refreshKey?: number;
  colorByGroomer?: boolean;
}) {
  const [filter, setFilter] = useState<StaffAppointmentFilter>("upcoming");
  const subtabs = showRecentFilter
    ? [...BASE_SUBTABS, RECENT_SUBTAB]
    : BASE_SUBTABS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {subtabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setFilter(t.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              filter === t.id
                ? "bg-brand text-white border-brand"
                : "bg-white text-brand border-gray-200 hover:border-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <AppointmentList
        key={`${refreshKey}-${filter}`}
        apiUrl={apiUrl}
        filter={filter}
        currentGroomerId={currentGroomerId}
        allowOverrideAvailability={allowOverrideAvailability}
        allowDelete={allowDelete}
        colorByGroomer={colorByGroomer}
      />
    </div>
  );
}
