"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import StaffAppointmentsPanel from "./StaffAppointmentsPanel";

const StaffAppointmentCalendar = dynamic(() => import("./StaffAppointmentCalendar"), {
  loading: () => <p className="text-sm text-gray-500">Loading calendar…</p>,
});

type View = "list" | "calendar";

const VIEWS: { id: View; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "list", label: "List" },
];

export default function AdminAppointmentsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [view, setView] = useState<View>("calendar");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              view === item.id
                ? "bg-brand text-white border-brand"
                : "bg-white text-brand border-gray-200 hover:border-accent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === "list" ? (
        <StaffAppointmentsPanel
          refreshKey={refreshKey}
          apiUrl="/api/admin/appointments"
          allowOverrideAvailability
          allowDelete
          showRecentFilter
          colorByGroomer
        />
      ) : (
        <StaffAppointmentCalendar mode="admin" refreshKey={refreshKey} />
      )}
    </div>
  );
}
