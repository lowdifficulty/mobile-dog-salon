"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SchedulingShell from "./SchedulingShell";
import TeamCalendarPanel from "./TeamCalendarPanel";
import StaffPaymentsPanel from "@/components/payments/StaffPaymentsPanel";
import QaDiagnosticsPanel from "./QaDiagnosticsPanel";
import LeadsPanel from "@/components/leads/LeadsPanel";
import FunnelAnalyticsPanel from "@/components/leads/FunnelAnalyticsPanel";
import LickyTrainingPanel from "./LickyTrainingPanel";
import StaffLoginLogPanel from "./StaffLoginLogPanel";
import StaffShiftsPanel from "./StaffShiftsPanel";
import JobInterviewsPanel from "@/components/interviews/JobInterviewsPanel";

type Tab =
  | "contacts"
  | "analytics"
  | "team-calendar"
  | "shifts"
  | "job-interviews"
  | "qa"
  | "payments"
  | "licky"
  | "logins";

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("contacts");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "contacts", label: "Contacts" },
    { id: "analytics", label: "Analytics" },
    { id: "team-calendar", label: "Team calendar" },
    { id: "shifts", label: "Shifts" },
    { id: "job-interviews", label: "Job Interviews" },
    { id: "qa", label: "QA" },
    { id: "payments", label: "Payments Beta" },
    { id: "licky", label: "Licky bot" },
    { id: "logins", label: "Logins" },
  ];

  return (
    <SchedulingShell
      title="Admin dashboard"
      subtitle="Contacts, analytics, team calendar, shifts, QA, payments, and staff logins."
      onLogout={logout}
    >
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((t) => (
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

      {tab === "contacts" && (
        <LeadsPanel apiBase="/api/staff/leads" contactsLayout hideJobApplicants />
      )}
      {tab === "analytics" && <FunnelAnalyticsPanel />}
      {tab === "team-calendar" && (
        <TeamCalendarPanel
          availabilityApi="/api/staff/availability"
          allowDeleteAppointments
        />
      )}
      {tab === "shifts" && <StaffShiftsPanel apiBase="/api/admin/availability" />}
      {tab === "job-interviews" && <JobInterviewsPanel />}
      {tab === "qa" && <QaDiagnosticsPanel />}
      {tab === "payments" && <StaffPaymentsPanel />}
      {tab === "licky" && <LickyTrainingPanel />}
      {tab === "logins" && <StaffLoginLogPanel />}
    </SchedulingShell>
  );
}
