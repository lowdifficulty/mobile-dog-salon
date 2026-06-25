"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import SchedulingShell from "./SchedulingShell";
import AvailabilityEditor from "./AvailabilityEditor";
import AppointmentList from "./AppointmentList";
import GroomerDailyRoute from "./GroomerDailyRoute";
import StaffBookAppointmentForm from "./StaffBookAppointmentForm";
import DashboardErrorBoundary from "./DashboardErrorBoundary";
import StaffTransferPrompt from "@/components/staff/StaffTransferPrompt";
import type { SessionUser } from "@/lib/scheduling/types";

const LeadsPanel = dynamic(() => import("@/components/leads/LeadsPanel"), {
  loading: () => <p className="text-sm text-gray-500">Loading leads…</p>,
});

const TeamCalendarPanel = dynamic(() => import("./TeamCalendarPanel"), {
  loading: () => <p className="text-sm text-gray-500">Loading team calendar…</p>,
});

type Tab = "route" | "upcoming" | "book" | "past" | "leads" | "team-calendar" | "availability";

export default function GroomerDashboard({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("route");
  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(0);
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
    { id: "route", label: "My route" },
    { id: "upcoming", label: "Upcoming" },
    { id: "book", label: "Book appointment" },
    { id: "past", label: "Past" },
    { id: "leads", label: "Leads" },
    { id: "team-calendar", label: "Team calendar" },
    { id: "availability", label: "My availability" },
  ];

  return (
    <>
      <StaffTransferPrompt groomerId={groomerId} />
      <SchedulingShell
        title={`${user.name}'s schedule`}
        subtitle="Daily route, upcoming appointments, leads, and team calendar."
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
          {tab === "upcoming" && (
            <AppointmentList
              key={appointmentRefreshKey}
              apiUrl="/api/groomer/appointments"
              filter="upcoming"
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
                setTab("upcoming");
              }}
            />
          )}
          {tab === "past" && (
            <AppointmentList
              apiUrl="/api/groomer/appointments"
              filter="past"
              currentGroomerId={groomerId}
            />
          )}
          {tab === "leads" && (
            <LeadsPanel
              hideJobApplicants
              allowDelete={false}
              apiBase="/api/staff/leads"
              currentGroomerId={groomerId}
            />
          )}
          {tab === "team-calendar" && (
            <TeamCalendarPanel
              availabilityOnly
              availabilityApi="/api/staff/availability"
            />
          )}
          {tab === "availability" && (
            <AvailabilityEditor
              apiBase="/api/groomer/availability"
              groomerId={groomerId}
            />
          )}
        </DashboardErrorBoundary>
      </SchedulingShell>
    </>
  );
}
