"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SchedulingShell from "./SchedulingShell";
import AvailabilityEditor from "./AvailabilityEditor";
import AppointmentList from "./AppointmentList";
import StaffPaymentsPanel from "@/components/payments/StaffPaymentsPanel";
import type { SessionUser } from "@/lib/scheduling/types";

type Tab = "availability" | "upcoming" | "past" | "payments";

export default function GroomerDashboard({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("availability");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/groomer/login");
    router.refresh();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "availability", label: "My availability" },
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past" },
    { id: "payments", label: "Payments" },
  ];

  return (
    <SchedulingShell
      title={`${user.name}'s schedule`}
      subtitle="Click days on the calendar to set your hours. Customers only see open slots you've marked."
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

      {tab === "availability" && (
        <AvailabilityEditor
          apiBase="/api/groomer/availability"
          groomerId={user.groomerId}
        />
      )}
      {tab === "upcoming" && (
        <AppointmentList apiUrl="/api/groomer/appointments" filter="upcoming" />
      )}
      {tab === "past" && (
        <AppointmentList apiUrl="/api/groomer/appointments" filter="past" />
      )}
      {tab === "payments" && <StaffPaymentsPanel />}
    </SchedulingShell>
  );
}
