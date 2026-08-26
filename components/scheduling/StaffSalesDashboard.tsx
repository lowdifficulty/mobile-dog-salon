"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import StaffAppShell, { type StaffNavItem } from "@/components/staff/StaffAppShell";
import StaffAppointmentsPanel from "./StaffAppointmentsPanel";
import StaffBookAppointmentForm from "./StaffBookAppointmentForm";
import type { StaffBookAppointmentPrefill } from "@/lib/scheduling/staff-book-prefill";
import DashboardErrorBoundary from "./DashboardErrorBoundary";
import CrmPanel from "@/components/crm/CrmPanel";
import OpportunitiesPanel from "@/components/crm/OpportunitiesPanel";
import StaffPaymentsPanel from "@/components/payments/StaffPaymentsPanel";
import { stashCrmOpenContact } from "@/lib/crm/open-conversation-client";
import type { SessionUser } from "@/lib/scheduling/types";

const TeamCalendarPanel = dynamic(() => import("./TeamCalendarPanel"), {
  loading: () => <p className="text-sm text-gray-500">Loading calendar…</p>,
});

type Tab =
  | "crm"
  | "appointments"
  | "opportunities"
  | "payments"
  | "team-calendar"
  | "book";

const NAV: StaffNavItem[] = [
  { id: "crm", label: "Conversations", group: "CRM" },
  { id: "opportunities", label: "Opportunities", group: "CRM" },
  { id: "payments", label: "Payments", group: "CRM" },
  { id: "appointments", label: "Appointments", group: "Schedule" },
  { id: "team-calendar", label: "Team Calendar", group: "Schedule" },
  { id: "book", label: "Book", group: "Schedule" },
];

export default function StaffSalesDashboard({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("crm");
  const [appointmentRefreshKey, setAppointmentRefreshKey] = useState(0);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [bookPrefill, setBookPrefill] = useState<StaffBookAppointmentPrefill | undefined>();
  const [bookFormKey, setBookFormKey] = useState(0);

  function openCrmConversation(contactId: string) {
    stashCrmOpenContact(contactId);
    setTab("crm");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/groomer/login");
    router.refresh();
  }

  const padded = tab !== "crm";

  return (
    <StaffAppShell
      title={`${user.name}'s workspace`}
      eyebrow={user.name}
      items={NAV}
      activeId={tab}
      onSelect={(id) => setTab(id as Tab)}
      onLogout={logout}
      storageKey="mds-staff-sidebar-collapsed"
      showDialer
      lockViewport={tab === "crm"}
    >
      <div className={padded ? "p-4 md:p-6" : "h-full min-h-0 overflow-hidden"}>
        <DashboardErrorBoundary>
          {tab === "crm" && <CrmPanel />}
          {tab === "opportunities" && (
            <OpportunitiesPanel onOpenConversation={openCrmConversation} />
          )}
          {tab === "payments" && <StaffPaymentsPanel />}
          {tab === "appointments" && (
            <StaffAppointmentsPanel
              apiUrl="/api/staff/appointments"
              allowOverrideAvailability
              allowDelete
              showRecentFilter
              colorByGroomer
              refreshKey={appointmentRefreshKey}
              onOpenConversation={openCrmConversation}
            />
          )}
          {tab === "book" && (
            <StaffBookAppointmentForm
              key={bookFormKey}
              defaultGroomerId="melanie"
              allowGroomerPick
              defaultOpen
              prefill={bookPrefill}
              onBooked={() => {
                setBookPrefill(undefined);
                setAppointmentRefreshKey((key) => key + 1);
                setCalendarRefreshKey((key) => key + 1);
                setTab("appointments");
              }}
            />
          )}
          {tab === "team-calendar" && (
            <TeamCalendarPanel
              availabilityApi="/api/staff/availability"
              calendarRefreshKey={calendarRefreshKey}
              onOpenConversation={openCrmConversation}
            />
          )}
        </DashboardErrorBoundary>
      </div>
    </StaffAppShell>
  );
}
