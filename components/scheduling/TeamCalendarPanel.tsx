"use client";

import { useState } from "react";
import AppointmentList from "./AppointmentList";
import TeamAvailabilityCalendar from "./TeamAvailabilityCalendar";
import AvailabilityHistoryPanel from "./AvailabilityHistoryPanel";
import { GROOMERS } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";

type TeamTab = "calendar" | "history" | "upcoming" | "past";

const TEAM_TABS: { id: TeamTab; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "history", label: "Schedule history" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

type GroomerFilter = GroomerId | "all";

export default function TeamCalendarPanel() {
  const [tab, setTab] = useState<TeamTab>("calendar");
  const [groomerId, setGroomerId] = useState<GroomerFilter>("all");

  const appointmentApi =
    groomerId === "all"
      ? "/api/admin/appointments"
      : `/api/admin/appointments?groomerId=${groomerId}`;
  const showGroomerPicker = tab === "upcoming" || tab === "past";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TEAM_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              tab === t.id
                ? "bg-brand text-white border-brand"
                : "bg-white text-brand border-gray-200 hover:border-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {showGroomerPicker && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-semibold text-gray-700">Groomer</label>
          <select
            value={groomerId}
            onChange={(e) => setGroomerId(e.target.value as GroomerFilter)}
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm font-semibold"
          >
            <option value="all">All groomers</option>
            {(Object.keys(GROOMERS) as GroomerId[]).map((id) => (
              <option key={id} value={id}>
                {GROOMERS[id].name}
              </option>
            ))}
          </select>
        </div>
      )}

      {tab === "calendar" && <TeamAvailabilityCalendar />}
      {tab === "history" && <AvailabilityHistoryPanel />}
      {tab === "upcoming" && (
        <AppointmentList apiUrl={appointmentApi} filter="upcoming" />
      )}
      {tab === "past" && <AppointmentList apiUrl={appointmentApi} filter="past" />}
    </div>
  );
}
