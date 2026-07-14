"use client";

import { useState } from "react";
import AppointmentList from "./AppointmentList";
import type { GroomerId } from "@/lib/scheduling/types";
import type { StaffAppointmentFilter } from "@/lib/scheduling/appointment-filters";

const SUBTABS: { id: StaffAppointmentFilter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
];

export default function StaffAppointmentsPanel({
  apiUrl,
  currentGroomerId,
  allowOverrideAvailability = false,
  allowDelete = false,
  refreshKey = 0,
}: {
  apiUrl: string;
  currentGroomerId?: GroomerId;
  allowOverrideAvailability?: boolean;
  allowDelete?: boolean;
  refreshKey?: number;
}) {
  const [filter, setFilter] = useState<StaffAppointmentFilter>("upcoming");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SUBTABS.map((t) => (
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
      />
    </div>
  );
}
