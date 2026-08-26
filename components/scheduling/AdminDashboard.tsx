"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import AdminAppShell, { type AdminNavItem } from "@/components/admin/AdminAppShell";
import TeamCalendarPanel from "./TeamCalendarPanel";
import StaffPaymentsPanel from "@/components/payments/StaffPaymentsPanel";
import QaDiagnosticsPanel from "./QaDiagnosticsPanel";
import FunnelAnalyticsPanel from "@/components/leads/FunnelAnalyticsPanel";
import LickyTrainingPanel from "./LickyTrainingPanel";
import StaffLoginLogPanel from "./StaffLoginLogPanel";
import StaffShiftsPanel from "./StaffShiftsPanel";
import AdminAccountingPanel from "@/components/accounting/AdminAccountingPanel";
import AdminAppointmentsPanel from "./AdminAppointmentsPanel";
import EmailCampaignsPanel from "@/components/admin/EmailCampaignsPanel";
import MassSmsPanel from "@/components/admin/MassSmsPanel";
import CrmPanel from "@/components/crm/CrmPanel";
import OpportunitiesPanel from "@/components/crm/OpportunitiesPanel";
import DashboardErrorBoundary from "./DashboardErrorBoundary";
import { stashCrmOpenContact } from "@/lib/crm/open-conversation-client";

const PhoneSmsPanel = dynamic(() => import("@/components/admin/PhoneSmsPanel"), {
  loading: () => <div className="p-6 text-sm text-gray-500">Loading Phone &amp; SMS…</div>,
});

type Tab =
  | "crm"
  | "opportunities"
  | "payments"
  | "twilio"
  | "emails"
  | "licky"
  | "qa"
  | "analytics"
  | "accounting"
  | "appointments"
  | "team-calendar"
  | "shifts"
  | "logins"
  | "mass-sms";

const NAV: AdminNavItem[] = [
  { id: "crm", label: "Conversations", group: "CRM" },
  { id: "opportunities", label: "Opportunities", group: "CRM" },
  { id: "payments", label: "Payments", group: "CRM" },
  { id: "mass-sms", label: "Mass SMS", group: "CRM" },
  { id: "appointments", label: "Appointments", group: "Admin" },
  { id: "team-calendar", label: "Team Calendar", group: "Admin" },
  { id: "twilio", label: "Phone & SMS", group: "Admin" },
  { id: "licky", label: "Licky Bot", group: "Admin" },
  { id: "emails", label: "Emails", group: "Admin" },
  { id: "shifts", label: "Hours", group: "Admin" },
  { id: "qa", label: "QA", group: "Admin" },
  { id: "accounting", label: "Accounting", group: "Insights" },
  { id: "analytics", label: "Analytics", group: "Insights" },
  { id: "logins", label: "Logins", group: "System" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("crm");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function openCrmConversation(contactId: string) {
    stashCrmOpenContact(contactId);
    setTab("crm");
  }

  const padded = tab !== "crm";

  return (
    <AdminAppShell
      title="Admin"
      items={NAV}
      activeId={tab}
      onSelect={(id) => setTab(id as Tab)}
      onLogout={logout}
      lockViewport={tab === "crm"}
    >
      <div className={padded ? "p-4 md:p-6" : "h-full min-h-0 overflow-hidden"}>
        <DashboardErrorBoundary>
          {tab === "crm" && <CrmPanel />}
          {tab === "opportunities" && (
            <OpportunitiesPanel onOpenConversation={openCrmConversation} />
          )}
          {tab === "payments" && <StaffPaymentsPanel />}
          {tab === "mass-sms" && <MassSmsPanel />}
          {tab === "twilio" && <PhoneSmsPanel />}
          {tab === "emails" && <EmailCampaignsPanel />}
          {tab === "licky" && <LickyTrainingPanel />}
          {tab === "qa" && <QaDiagnosticsPanel />}
          {tab === "analytics" && <FunnelAnalyticsPanel />}
          {tab === "accounting" && <AdminAccountingPanel />}
          {tab === "appointments" && (
            <AdminAppointmentsPanel onOpenConversation={openCrmConversation} />
          )}
          {tab === "team-calendar" && (
            <TeamCalendarPanel
              availabilityApi="/api/staff/availability"
              allowDeleteAppointments
              onOpenConversation={openCrmConversation}
            />
          )}
          {tab === "shifts" && <StaffShiftsPanel apiBase="/api/admin/availability" />}
          {tab === "logins" && <StaffLoginLogPanel />}
        </DashboardErrorBoundary>
      </div>
    </AdminAppShell>
  );
}
