"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdminAppShell, { type AdminNavItem } from "@/components/admin/AdminAppShell";
import PhoneSmsHubPanel, {
  type PhoneSmsSectionId,
  phoneSmsSectionLabel,
} from "@/components/admin/PhoneSmsHubPanel";
import TeamCalendarPanel from "./TeamCalendarPanel";
import FunnelAnalyticsPanel from "@/components/leads/FunnelAnalyticsPanel";
import StaffLoginLogPanel from "./StaffLoginLogPanel";
import StaffShiftsPanel from "./StaffShiftsPanel";
import AdminAccountingPanel from "@/components/accounting/AdminAccountingPanel";
import AdminAppointmentsPanel from "./AdminAppointmentsPanel";
import CrmPanel from "@/components/crm/CrmPanel";
import OpportunitiesPanel from "@/components/crm/OpportunitiesPanel";

type Tab =
  | "crm"
  | "opportunities"
  | "twilio"
  | "analytics"
  | "accounting"
  | "appointments"
  | "team-calendar"
  | "shifts"
  | "logins";

const NAV: AdminNavItem[] = [
  { id: "crm", label: "Conversations", group: "CRM" },
  { id: "opportunities", label: "Opportunities", group: "CRM" },
  { id: "appointments", label: "Appointments", group: "Operations" },
  { id: "shifts", label: "Hours", group: "Operations" },
  { id: "team-calendar", label: "Team calendar", group: "Operations" },
  { id: "twilio", label: "Phone & SMS", group: "Operations" },
  { id: "analytics", label: "Analytics", group: "Insights" },
  { id: "accounting", label: "Accounting", group: "Insights" },
  { id: "logins", label: "Logins", group: "System" },
];

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("crm");
  const [phoneSmsSection, setPhoneSmsSection] = useState<PhoneSmsSectionId>("settings");

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
  const headerTitle =
    tab === "twilio"
      ? `Phone & SMS · ${phoneSmsSectionLabel(phoneSmsSection)}`
      : undefined;

  return (
    <AdminAppShell
      title="Admin"
      items={NAV}
      activeId={tab}
      headerTitle={headerTitle}
      onSelect={(id) => setTab(id as Tab)}
      onLogout={logout}
    >
      <div className={padded ? "p-4 md:p-6" : ""}>
        {tab === "crm" && <CrmPanel />}
        {tab === "opportunities" && (
          <OpportunitiesPanel onOpenConversation={openCrmConversation} />
        )}
        {tab === "twilio" && (
          <PhoneSmsHubPanel
            section={phoneSmsSection}
            onSectionChange={setPhoneSmsSection}
          />
        )}
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
