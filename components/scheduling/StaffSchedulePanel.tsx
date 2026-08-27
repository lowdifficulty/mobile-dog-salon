"use client";

import { useState } from "react";
import StaffAppointmentsPanel from "./StaffAppointmentsPanel";
import TooFarAppointmentsList from "./TooFarAppointmentsList";

type View = "list" | "tooFar";

const VIEWS: { id: View; label: string }[] = [
  { id: "list", label: "List" },
  { id: "tooFar", label: "Too Far Please Review" },
];

export default function StaffSchedulePanel({
  refreshKey = 0,
  onOpenConversation,
}: {
  refreshKey?: number;
  onOpenConversation?: (contactId: string) => void;
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

      {view === "tooFar" ? (
        <TooFarAppointmentsList
          refreshKey={refreshKey}
          apiUrl="/api/staff/appointments"
          colorByGroomer
        />
      ) : (
        <StaffAppointmentsPanel
          refreshKey={refreshKey}
          apiUrl="/api/staff/appointments"
          allowOverrideAvailability
          allowDelete
          showRecentFilter
          colorByGroomer
          onOpenConversation={onOpenConversation}
        />
      )}
    </div>
  );
}
