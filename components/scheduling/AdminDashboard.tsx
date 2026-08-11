"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminAppShell, { type AdminNavItem } from "@/components/admin/AdminAppShell";
import PhoneSmsPanel from "@/components/admin/PhoneSmsPanel";
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
import CrmPanel from "@/components/crm/CrmPanel";
import OpportunitiesPanel from "@/components/crm/OpportunitiesPanel";

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
  | "logins";

const NAV: AdminNavItem[] = [
  { id: "crm", label: "Conversations", group: "CRM" },
  { id: "opportunities", label: "Opportunities", group: "CRM" },
  { id: "payments", label: "Payments", group: "CRM" },
  { id: "appointments", label: "Appointments", group: "Operations" },
  { id: "shifts", label: "Hours", group: "Operations" },
  { id: "team-calendar", label: "Team calendar", group: "Operations" },
  { id: "twilio", label: "Phone & SMS", group: "Operations" },
  { id: "emails", label: "Emails", group: "Operations" },
  { id: "licky", label: "Licky bot", group: "Operations" },
  { id: "qa", label: "QA", group: "Operations" },
  { id: "analytics", label: "Analytics", group: "Insights" },
  { id: "accounting", label: "Accounting", group: "Insights" },
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
    try {
      sessionStorage.setItem("mds-crm-open-contact", contactId);
    } catch {
      /* ignore */
    }
    setTab("crm");
  }

  const padded = tab !== "crm" && tab !== "twilio";

  return (
    <AdminAppShell
      title="Admin"
      items={NAV}
      activeId={tab}
      onSelect={(id) => setTab(id as Tab)}
      onLogout={logout}
    >
      <div className={padded ? "p-4 md:p-6" : ""}>
        {tab === "crm" && <CrmPanel />}
        {tab === "opportunities" && (
          <OpportunitiesPanel onOpenConversation={openCrmConversation} />
        )}
        {tab === "payments" && <StaffPaymentsPanel />}
        {tab === "twilio" && <PhoneSmsPanel />}
        {tab === "emails" && <EmailCampaignsPanel />}
        {tab === "licky" && <LickyTrainingPanel />}
        {tab === "qa" && <QaDiagnosticsPanel />}
        {tab === "analytics" && <FunnelAnalyticsPanel />}
        {tab === "accounting" && <AdminAccountingPanel />}
        {tab === "appointments" && <AdminAppointmentsPanel />}
        {tab === "team-calendar" && (
          <TeamCalendarPanel
            availabilityApi="/api/staff/availability"
            allowDeleteAppointments
          />
        )}
        {tab === "shifts" && <StaffShiftsPanel apiBase="/api/admin/availability" />}
        {tab === "logins" && <StaffLoginLogPanel />}
      </div>
    </AdminAppShell>
  );
}
