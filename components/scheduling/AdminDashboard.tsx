"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminAppShell, { type AdminNavItem } from "@/components/admin/AdminAppShell";
import TeamCalendarPanel from "./TeamCalendarPanel";
import StaffPaymentsPanel from "@/components/payments/StaffPaymentsPanel";
import QaDiagnosticsPanel from "./QaDiagnosticsPanel";
import LeadsPanel from "@/components/leads/LeadsPanel";
import FunnelAnalyticsPanel from "@/components/leads/FunnelAnalyticsPanel";
import LickyTrainingPanel from "./LickyTrainingPanel";
import StaffLoginLogPanel from "./StaffLoginLogPanel";
import StaffShiftsPanel from "./StaffShiftsPanel";
import AdminAccountingPanel from "@/components/accounting/AdminAccountingPanel";
import AdminAppointmentsPanel from "./AdminAppointmentsPanel";
import EmailCampaignsPanel from "@/components/admin/EmailCampaignsPanel";
import CrmPanel from "@/components/crm/CrmPanel";
import CrmContactsPanel from "@/components/crm/CrmContactsPanel";
import SmsBotPanel from "@/components/crm/SmsBotPanel";
import TwilioSettingsPanel from "@/components/admin/TwilioSettingsPanel";

type Tab =
  | "crm"
  | "crm-contacts"
  | "opportunities"
  | "sms-bot"
  | "twilio"
  | "analytics"
  | "accounting"
  | "appointments"
  | "team-calendar"
  | "shifts"
  | "qa"
  | "payments"
  | "licky"
  | "logins"
  | "emails";

const NAV: AdminNavItem[] = [
  { id: "crm", label: "Conversations", group: "CRM" },
  { id: "crm-contacts", label: "Contacts", group: "CRM" },
  { id: "opportunities", label: "Opportunities", group: "CRM" },
  { id: "sms-bot", label: "SMS Chatbot", group: "CRM" },
  { id: "twilio", label: "Phone & SMS", group: "CRM" },
  { id: "appointments", label: "List", group: "Operations" },
  { id: "shifts", label: "Hours", group: "Operations" },
  { id: "team-calendar", label: "Team calendar", group: "Operations" },
  { id: "analytics", label: "Analytics", group: "Insights" },
  { id: "accounting", label: "Accounting", group: "Insights" },
  { id: "emails", label: "Emails", group: "Insights" },
  { id: "payments", label: "Payments", group: "Insights" },
  { id: "licky", label: "Licky bot", group: "AI" },
  { id: "qa", label: "QA", group: "System" },
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

  const padded = tab !== "crm";

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
        {tab === "crm-contacts" && (
          <CrmContactsPanel onOpenConversation={openCrmConversation} />
        )}
        {tab === "opportunities" && (
          <LeadsPanel apiBase="/api/staff/leads" contactsLayout hideJobApplicants />
        )}
        {tab === "sms-bot" && <SmsBotPanel />}
        {tab === "twilio" && <TwilioSettingsPanel />}
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
        {tab === "qa" && <QaDiagnosticsPanel />}
        {tab === "payments" && <StaffPaymentsPanel />}
        {tab === "emails" && <EmailCampaignsPanel />}
        {tab === "licky" && <LickyTrainingPanel />}
        {tab === "logins" && <StaffLoginLogPanel />}
      </div>
    </AdminAppShell>
  );
}
