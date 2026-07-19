"use client";

import { useState } from "react";
import AppointmentList from "./AppointmentList";
import StaffBookAppointmentForm from "./StaffBookAppointmentForm";
import TeamAvailabilityCalendar from "./TeamAvailabilityCalendar";
import AvailabilityHistoryPanel from "./AvailabilityHistoryPanel";
import { GROOMERS, defaultBookableGroomerId, groomerAcceptsBookings } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";

type TeamTab = "calendar" | "history" | "upcoming" | "past";

const TEAM_TABS: { id: TeamTab; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "history", label: "Schedule history" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

type GroomerFilter = GroomerId | "all";

export default function TeamCalendarPanel({
  availabilityOnly = false,
  availabilityApi = "/api/admin/availability",
  calendarRefreshKey: externalCalendarRefreshKey = 0,
  allowDeleteAppointments = false,
  scopeGroomerId,
}: {
  availabilityOnly?: boolean;
  availabilityApi?: string;
  calendarRefreshKey?: number;
  allowDeleteAppointments?: boolean;
  scopeGroomerId?: GroomerId;
}) {
  const [tab, setTab] = useState<TeamTab>("calendar");
  const [groomerId, setGroomerId] = useState<GroomerFilter>("all");
  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(0);
  const [localCalendarRefreshKey, setLocalCalendarRefreshKey] = useState(0);
  const calendarRefreshKey = externalCalendarRefreshKey + localCalendarRefreshKey;

  const appointmentApi =
    groomerId === "all"
      ? "/api/admin/appointments"
      : `/api/admin/appointments?groomerId=${groomerId}`;
  const showGroomerPicker = !availabilityOnly && (tab === "upcoming" || tab === "past");
  const visibleTabs = availabilityOnly
    ? TEAM_TABS.filter((t) => t.id === "calendar")
    : TEAM_TABS;

  return (
    <div className="space-y-6">
      {!availabilityOnly && (
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((t) => (
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
      )}

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

      {tab === "calendar" && (
        <TeamAvailabilityCalendar
          availabilityApi={availabilityApi}
          refreshKey={calendarRefreshKey}
          scopeGroomerId={scopeGroomerId}
        />
      )}
      {tab === "history" && <AvailabilityHistoryPanel />}
      {tab === "upcoming" && (
        <>
          <StaffBookAppointmentForm
            defaultGroomerId={
              groomerId === "all" || !groomerAcceptsBookings(groomerId)
                ? defaultBookableGroomerId()
                : groomerId
            }
            allowGroomerPick={groomerId === "all"}
            onBooked={() => {
              setAppointmentRefreshKey((key) => key + 1);
              setLocalCalendarRefreshKey((key) => key + 1);
            }}
          />
          <AppointmentList
            key={appointmentRefreshKey}
            apiUrl={appointmentApi}
            filter="upcoming"
            allowOverrideAvailability
            allowDelete={allowDeleteAppointments}
          />
        </>
      )}
      {tab === "past" && (
        <AppointmentList
          apiUrl={appointmentApi}
          filter="past"
          allowDelete={allowDeleteAppointments}
        />
      )}
    </div>
  );
}
