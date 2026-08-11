"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import StaffAppShell, { type StaffNavItem } from "@/components/staff/StaffAppShell";
import GroomerShiftsTab from "./GroomerShiftsTab";
import GroomerAppointmentsPanel from "./GroomerAppointmentsPanel";
import GroomerDailyRoute from "./GroomerDailyRoute";
import StaffBookAppointmentForm from "./StaffBookAppointmentForm";
import type { StaffBookAppointmentPrefill } from "@/lib/scheduling/staff-book-prefill";
import {
  invalidateStaffAppointmentsCache,
  prefetchStaffAppointments,
} from "@/lib/scheduling/use-staff-appointments-cache";
import DashboardErrorBoundary from "./DashboardErrorBoundary";
import StaffTransferPrompt from "@/components/staff/StaffTransferPrompt";
import GroomerActiveClientsPanel from "./GroomerActiveClientsPanel";
import LeadsPanel from "@/components/leads/LeadsPanel";
import CrmPanel from "@/components/crm/CrmPanel";
import { groomerSeesTeamAppointments } from "@/lib/scheduling/groomers";
import type { SessionUser } from "@/lib/scheduling/types";

const TeamCalendarPanel = dynamic(() => import("./TeamCalendarPanel"), {
  loading: () => <p className="text-sm text-gray-500">Loading calendar…</p>,
});

type Tab =
  | "crm"
  | "appointments"
  | "route"
  | "book"
  | "team-calendar"
  | "availability"
  | "clients"
  | "follow-ups";

export default function GroomerDashboard({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("crm");
  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(0);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [bookPrefill, setBookPrefill] = useState<StaffBookAppointmentPrefill | undefined>();
  const [bookFormKey, setBookFormKey] = useState(0);
  const groomerId = user.groomerId;

  function openRebook(prefill: StaffBookAppointmentPrefill) {
    setBookPrefill(prefill);
    setBookFormKey((key) => key + 1);
    setTab("book");
  }

  useEffect(() => {
    if (!groomerId) return;
    void prefetchStaffAppointments(groomerId, {
      apiUrl: "/api/groomer/appointments",
      query: "filter=all",
    });
  }, [groomerId]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/groomer/login");
    router.refresh();
  }

  if (!groomerId) {
    return (
      <StaffAppShell
        title="Groomer dashboard"
        eyebrow="Groomer"
        items={[{ id: "appointments", label: "Appointments", group: "Schedule" }]}
        activeId="appointments"
        onSelect={() => undefined}
        onLogout={logout}
        storageKey="mds-groomer-sidebar-collapsed"
      >
        <div className="p-4 md:p-6">
          <p className="text-sm text-red-600">Invalid groomer session. Please sign in again.</p>
        </div>
      </StaffAppShell>
    );
  }

  const seesTeamAppointments = groomerSeesTeamAppointments(groomerId);
  const isMelanie = groomerId === "melanie";

  const nav: StaffNavItem[] = [
    { id: "crm", label: "Conversations", group: "CRM" },
    { id: "appointments", label: "Appointments", group: "Schedule" },
    ...(isMelanie ? [{ id: "follow-ups" as const, label: "Follow-ups", group: "Schedule" }] : []),
    { id: "availability", label: "My hours", group: "Schedule" },
    { id: "clients", label: "Active clients", group: "Schedule" },
    { id: "route", label: "Route", group: "Schedule" },
    { id: "book", label: "Book", group: "Schedule" },
    { id: "team-calendar", label: "Team Availability", group: "Schedule" },
  ];

  const padded = tab !== "crm";

  return (
    <>
      <StaffTransferPrompt groomerId={groomerId} />
      <StaffAppShell
        title={`${user.name}'s workspace`}
        eyebrow={user.name}
        items={nav}
        activeId={tab}
        onSelect={(id) => {
          if (id === "book" && groomerId) {
            void prefetchStaffAppointments(groomerId, {
              apiUrl: "/api/groomer/appointments",
              query: "filter=all",
            });
          }
          setTab(id as Tab);
        }}
        onLogout={logout}
        storageKey="mds-groomer-sidebar-collapsed"
      >
        <div className={padded ? "p-4 md:p-6" : ""} data-groomer-shell="ghl-v1">
          <DashboardErrorBoundary>
            {tab === "crm" && <CrmPanel />}
            {tab === "route" && (
              <GroomerDailyRoute groomerId={groomerId} onRebook={openRebook} />
            )}
            {tab === "clients" && <GroomerActiveClientsPanel groomerId={groomerId} />}
            {tab === "appointments" && (
              <GroomerAppointmentsPanel
                groomerId={groomerId}
                refreshKey={appointmentRefreshKey}
                onRebook={openRebook}
              />
            )}
            {tab === "book" && (
              <StaffBookAppointmentForm
                key={bookFormKey}
                defaultGroomerId={groomerId}
                defaultOpen
                prefill={bookPrefill}
                onBooked={() => {
                  setBookPrefill(undefined);
                  invalidateStaffAppointmentsCache(groomerId);
                  void prefetchStaffAppointments(groomerId, {
                    apiUrl: "/api/groomer/appointments",
                    query: "filter=all",
                  });
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
                scopeGroomerId={seesTeamAppointments ? undefined : groomerId}
              />
            )}
            {tab === "availability" && <GroomerShiftsTab groomerId={groomerId} />}
            {tab === "follow-ups" && isMelanie && (
              <LeadsPanel
                apiBase="/api/staff/leads"
                melanieFollowUpCrm
                hideJobApplicants
                allowDelete={false}
              />
            )}
          </DashboardErrorBoundary>
        </div>
      </StaffAppShell>
    </>
  );
}
