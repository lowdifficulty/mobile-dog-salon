"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SchedulingShell from "./SchedulingShell";
import AvailabilityEditor from "./AvailabilityEditor";
import AppointmentList from "./AppointmentList";
import { GROOMERS } from "@/lib/scheduling/groomers";
import StaffPaymentsPanel from "@/components/payments/StaffPaymentsPanel";
import type { GroomerId } from "@/lib/scheduling/types";

type Tab = "availability" | "upcoming" | "past" | "payments";

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [groomerId, setGroomerId] = useState<GroomerId>("melanie");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "availability", label: "Availability" },
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
    { id: "payments", label: "Payments" },
  ];

  const appointmentApi = `/api/admin/appointments?groomerId=${groomerId}`;
  const availabilityApi = `/api/admin/availability?groomerId=${groomerId}`;

  return (
    <SchedulingShell
      title="Admin dashboard"
      subtitle="View Melanie and Diamond's schedules and appointments."
      onLogout={logout}
    >
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

      {tab === "availability" && (
        <AvailabilityEditor apiBase={availabilityApi} groomerId={groomerId} readOnly />
      )}
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
