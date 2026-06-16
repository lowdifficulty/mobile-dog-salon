"use client";

import { useEffect, useState } from "react";
import { SERVICE_OPTIONS } from "@/lib/constants";
import { GROOMERS } from "@/lib/scheduling/groomers";
import type { Appointment } from "@/lib/scheduling/types";

function formatWhen(startAt: string) {
  return new Date(startAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

export default function AppointmentList({
  apiUrl,
  filter,
}: {
  apiUrl: string;
  filter: "upcoming" | "past";
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${apiUrl}?filter=${filter}`)
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments ?? []))
      .finally(() => setLoading(false));
  }, [apiUrl, filter]);

  if (loading) return <p className="text-gray-500 text-sm">Loading appointments…</p>;

  if (appointments.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-8 text-center">
        {filter === "upcoming" ? "No upcoming appointments." : "No past appointments yet."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((ap) => {
        const serviceLabel =
          SERVICE_OPTIONS.find((s) => s.value === ap.service)?.label ?? ap.service;
        return (
          <div key={ap.id} className="site-card p-4 border-l-4 border-accent">
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <p className="font-bold text-brand">{formatWhen(ap.startAt)}</p>
              <p className="text-sm text-gray-500">{GROOMERS[ap.groomerId].name}</p>
            </div>
            <p className="text-sm text-gray-800">
              <strong>{ap.petName}</strong> ({ap.petBreed}) — {serviceLabel}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {ap.firstName} {ap.lastName} · {ap.phone}
            </p>
            <p className="text-sm text-gray-600">{ap.address}, {ap.city}</p>
            {ap.notes && <p className="text-sm text-gray-500 mt-2">Notes: {ap.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}
