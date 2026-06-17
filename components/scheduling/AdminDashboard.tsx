"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SchedulingShell from "./SchedulingShell";
import AppointmentList from "./AppointmentList";
import TeamAvailabilityCalendar from "./TeamAvailabilityCalendar";
import { GROOMERS } from "@/lib/scheduling/groomers";
import StaffPaymentsPanel from "@/components/payments/StaffPaymentsPanel";
import type { GroomerId } from "@/lib/scheduling/types";

type Tab = "team-calendar" | "upcoming" | "past" | "payments";

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("team-calendar");
  const [groomerId, setGroomerId] = useState<GroomerId>("melanie");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "team-calendar", label: "Team calendar" },
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
    { id: "payments", label: "Payments" },
  ];

  const appointmentApi = `/api/admin/appointments?groomerId=${groomerId}`;
  const showGroomerPicker = tab === "upcoming" || tab === "past";

  return (
    <SchedulingShell
      title="Admin dashboard"
      subtitle="Melanie and Diamond's team calendar, appointments, and payments."
      onLogout={logout}
    >
      {showGroomerPicker && (
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <label className="text-sm font-semibold text-gray-700">Groomer</label>
          <select
            value={groomerId}
            onChange={(e) => setGroomerId(e.target.value as GroomerId)}
            className="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm font-semibold"
          >
            {(Object.keys(GROOMERS) as GroomerId[]).map((id) => (
              <option key={id} value={id}>{GROOMERS[id].name}</option>
            ))}
          </select>
        </div>
      )}

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

      {tab === "team-calendar" && <TeamAvailabilityCalendar />}
      {tab === "upcoming" && (
        <AppointmentList apiUrl={appointmentApi} filter="upcoming" />
      )}
      {tab === "past" && (
        <AppointmentList apiUrl={appointmentApi} filter="past" />
      )}
      {tab === "payments" && <StaffPaymentsPanel />}
    </SchedulingShell>
  );
}
