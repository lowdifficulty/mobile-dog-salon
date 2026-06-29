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

type Tab = "contacts" | "analytics" | "team-calendar" | "qa" | "payments" | "licky";

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
    { id: "qa", label: "QA" },
    { id: "payments", label: "Payments Beta" },
    { id: "licky", label: "Licky bot" },
  ];

  return (
    <SchedulingShell
      title="Admin dashboard"
      subtitle="Contacts, analytics, team calendar, QA, and payments."
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
        <TeamCalendarPanel availabilityApi="/api/staff/availability" />
      )}
      {tab === "qa" && <QaDiagnosticsPanel />}
      {tab === "payments" && <StaffPaymentsPanel />}
      {tab === "licky" && <LickyTrainingPanel />}
    </SchedulingShell>
  );
}
