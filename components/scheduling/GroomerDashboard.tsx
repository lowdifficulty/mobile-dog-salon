"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import SchedulingShell from "./SchedulingShell";
import AvailabilityEditor from "./AvailabilityEditor";
import StaffAppointmentsPanel from "./StaffAppointmentsPanel";
import GroomerDailyRoute from "./GroomerDailyRoute";
import StaffBookAppointmentForm from "./StaffBookAppointmentForm";
import DashboardErrorBoundary from "./DashboardErrorBoundary";
import StaffTransferPrompt from "@/components/staff/StaffTransferPrompt";
import GroomerActiveClientsPanel from "./GroomerActiveClientsPanel";
import VanCapacityOverview from "./VanCapacityOverview";
import type { SessionUser } from "@/lib/scheduling/types";

const TeamCalendarPanel = dynamic(() => import("./TeamCalendarPanel"), {
  loading: () => <p className="text-sm text-gray-500">Loading calendar…</p>,
});

type Tab = "appointments" | "route" | "book" | "team-calendar" | "availability" | "clients";

export default function GroomerDashboard({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("appointments");
  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(0);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const groomerId = user.groomerId;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/groomer/login");
    router.refresh();
  }

  if (!groomerId) {
    return (
      <SchedulingShell title="Groomer dashboard" onLogout={logout}>
        <p className="text-sm text-red-600">Invalid groomer session. Please sign in again.</p>
      </SchedulingShell>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "appointments", label: "Appointments" },
    { id: "clients", label: "Active clients" },
    { id: "route", label: "Route" },
    { id: "book", label: "Book" },
    { id: "team-calendar", label: "Calendar" },
    { id: "availability", label: "Shifts" },
  ];

  return (
    <>
      <StaffTransferPrompt groomerId={groomerId} />
      <SchedulingShell
        title={`${user.name}'s schedule`}
        subtitle="Appointments, active clients, daily route, calendar, and shifts."
        onLogout={logout}
      >
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-grey" data-groomer-tabs="v2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                tab === t.id
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-brand border-gray-200 hover:border-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <DashboardErrorBoundary>
          {tab === "route" && <GroomerDailyRoute groomerId={groomerId} />}
          {tab === "clients" && <GroomerActiveClientsPanel groomerId={groomerId} />}
          {tab === "appointments" && (
            <StaffAppointmentsPanel
              refreshKey={appointmentRefreshKey}
              apiUrl="/api/groomer/appointments"
              currentGroomerId={groomerId}
              allowOverrideAvailability
            />
          )}
          {tab === "book" && (
            <StaffBookAppointmentForm
              defaultGroomerId={groomerId}
              defaultOpen
              onBooked={() => {
                setAppointmentRefreshKey((key) => key + 1);
                setCalendarRefreshKey((key) => key + 1);
                setTab("appointments");
              }}
            />
          )}
          {tab === "team-calendar" && (
            <TeamCalendarPanel
              availabilityOnly
              availabilityApi="/api/staff/availability"
              calendarRefreshKey={calendarRefreshKey}
            />
          )}
          {tab === "availability" && (
            <div>
              <VanCapacityOverview />
              <AvailabilityEditor
                apiBase="/api/groomer/availability"
                groomerId={groomerId}
              />
            </div>
          )}
        </DashboardErrorBoundary>
      </SchedulingShell>
    </>
  );
}
