"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import StaffAppointmentsPanel from "./StaffAppointmentsPanel";
import type { GroomerId } from "@/lib/scheduling/types";

const GroomerAppointmentCalendar = dynamic(() => import("./GroomerAppointmentCalendar"), {
  loading: () => <p className="text-sm text-gray-500">Loading calendar…</p>,
});

type View = "list" | "calendar";

const VIEWS: { id: View; label: string }[] = [
  { id: "list", label: "List" },
  { id: "calendar", label: "Calendar" },
];

export default function GroomerAppointmentsPanel({
  groomerId,
  refreshKey = 0,
}: {
  groomerId: GroomerId;
  refreshKey?: number;
}) {
  const [view, setView] = useState<View>("list");

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
          apiUrl="/api/groomer/appointments"
          currentGroomerId={groomerId}
          allowOverrideAvailability
        />
      ) : (
        <GroomerAppointmentCalendar groomerId={groomerId} refreshKey={refreshKey} />
      )}
    </div>
  );
}
