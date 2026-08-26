"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import StaffAppointmentsPanel from "./StaffAppointmentsPanel";
import TooFarAppointmentsList from "./TooFarAppointmentsList";
import type { GroomerId } from "@/lib/scheduling/types";

import type { StaffBookAppointmentPrefill } from "@/lib/scheduling/staff-book-prefill";

const StaffAppointmentCalendar = dynamic(() => import("./StaffAppointmentCalendar"), {
  loading: () => <p className="text-sm text-gray-500">Loading calendar…</p>,
});

type View = "calendar" | "list" | "tooFar";

const VIEWS: { id: View; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "list", label: "List" },
  { id: "tooFar", label: "Too Far Please Review" },
];

export default function GroomerAppointmentsPanel({
  groomerId,
  refreshKey = 0,
  onRebook,
  onOpenConversation,
}: {
  groomerId: GroomerId;
  refreshKey?: number;
  onRebook?: (prefill: StaffBookAppointmentPrefill) => void;
  onOpenConversation?: (contactId: string) => void;
}) {
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
          apiUrl="/api/groomer/appointments"
          currentGroomerId={groomerId}
          allowOverrideAvailability
          colorByGroomer
          onOpenConversation={onOpenConversation}
        />
      ) : view === "tooFar" ? (
        <TooFarAppointmentsList
          refreshKey={refreshKey}
          apiUrl="/api/groomer/appointments"
          currentGroomerId={groomerId}
          colorByGroomer
        />
      ) : (
        <StaffAppointmentCalendar
          mode="groomer"
          groomerId={groomerId}
          refreshKey={refreshKey}
          onRebook={onRebook}
          onOpenConversation={onOpenConversation}
        />
      )}
    </div>
  );
}
