"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import WeekAvailabilityPicker from "@/components/scheduling/WeekAvailabilityPicker";
import { formatPhoneDisplay } from "@/lib/leads/normalize";
import { formatPrice } from "@/lib/pricing";
import { ROUTES } from "@/lib/routes";
import type { AvailableSlot } from "@/lib/scheduling/types";

interface PublicAppointment {
  id: string;
  startAt: string;
  groomerId: string;
  groomerName: string;
  service: string;
  petName: string;
  petSize: string;
  status: string;
  address: string;
  city: string;
  zipCode: string;
  isUpcoming: boolean;
  quotedPrice: number | null;
}

function formatApptDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function formatService(service: string) {
  return service.replace(/-/g, " ");
}

export default function MyAppointmentPanel() {
  const [phone, setPhone] = useState("");
  const [phoneDisplay, setPhoneDisplay] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<PublicAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [apptBusy, setApptBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState("");
  const [pickerSlotKey, setPickerSlotKey] = useState("");

  const applyLookupResult = useCallback(
    (data: { phoneDisplay?: string; appointments?: PublicAppointment[] }) => {
      setPhoneDisplay(data.phoneDisplay ?? null);
      setAppointments(data.appointments ?? []);
      setVerified(true);
      setError("");
    },
    []
  );

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/my-appointment");
    if (res.status === 401) {
      setVerified(false);
      setLoading(false);
      return;
    }
    if (!res.ok) {
      setError("Could not load your appointments.");
      setLoading(false);
      return;
    }
    applyLookupResult(await res.json());
    setLoading(false);
  }, [applyLookupResult]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setLookupBusy(true);
    setError("");
    const res = await fetch("/api/my-appointment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLookupBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not find appointments for that number.");
      return;
    }
    applyLookupResult(data);
  }

  async function handleUseDifferentNumber() {
    await fetch("/api/my-appointment", { method: "DELETE" });
    setVerified(false);
    setPhone("");
    setPhoneDisplay(null);
    setAppointments([]);
    setRescheduleId(null);
    setPickerSlotKey("");
    setError("");
  }

  async function handleCancel(id: string) {
    if (!window.confirm("Cancel this appointment?")) return;
    setApptBusy(id);
    setError("");
    const res = await fetch(`/api/my-appointment/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setApptBusy(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not cancel appointment.");
      return;
    }
    await loadSession();
  }

  async function handleReschedule(id: string) {
    if (!pickerSlotKey) return;
    setApptBusy(id);
    setError("");
    const res = await fetch(`/api/my-appointment/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", slotKey: pickerSlotKey }),
    });
    setApptBusy(null);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not reschedule appointment.");
      return;
    }
    setRescheduleId(null);
    setPickerSlotKey("");
    await loadSession();
  }

  function selectSlot(slot: AvailableSlot) {
    setPickerSlotKey(slot.slotKey);
    setPickerDate(slot.date);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  if (!verified) {
    return (
      <div className="site-container max-w-lg py-10 md:py-14">
        <div className="site-card p-6 md:p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-brand">My Appointment</h1>
            <p className="text-sm text-gray-600 mt-2">
              Enter the mobile number you used when booking to view, reschedule, or cancel your visit.
            </p>
          </div>

          <form onSubmit={(e) => void handleLookup(e)} className="space-y-4">
            <div>
              <label htmlFor="my-appointment-phone" className="block text-sm font-semibold text-gray-700 mb-1">
                Mobile number
              </label>
              <input
                id="my-appointment-phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={lookupBusy} className="site-btn w-full disabled:opacity-50">
              {lookupBusy ? "Looking up…" : "Find my appointments"}
            </button>
          </form>

          <p className="text-sm text-gray-500">
            Have a client portal account?{" "}
            <Link href={ROUTES.clientLogin} className="font-semibold text-brand hover:underline">
              Log in here
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const upcoming = appointments.filter((ap) => ap.isUpcoming);
  const past = appointments.filter((ap) => !ap.isUpcoming);

  return (
    <div className="site-container max-w-3xl py-10 md:py-14 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand">My Appointment</h1>
          <p className="text-sm text-gray-600 mt-1">
            Showing appointments for{" "}
            <span className="font-semibold text-gray-800">
              {phoneDisplay ?? formatPhoneDisplay(phone)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleUseDifferentNumber()}
          className="text-sm font-semibold text-brand hover:underline"
        >
          Use a different number
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {appointments.length === 0 ? (
        <div className="site-card p-6 text-sm text-gray-600">
          <p>No confirmed appointments were found for this number.</p>
          <p className="mt-3">
            Need to book?{" "}
            <Link href={ROUTES.book} className="font-semibold text-brand hover:underline">
              Book online
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-4">
            <h2 className="font-bold text-lg text-gray-900">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming appointments.</p>
            ) : (
              upcoming.map((ap) => (
                <div key={ap.id} className="site-card p-5 space-y-3">
                  <div>
                    <p className="font-bold text-gray-900">{ap.petName || "Your pet"}</p>
                    <p className="text-sm text-gray-600">{formatApptDate(ap.startAt)}</p>
                    <p className="text-sm text-gray-500 capitalize">
                      {formatService(ap.service)} · {ap.groomerName}
                      {ap.quotedPrice != null && ` · ${formatPrice(ap.quotedPrice)}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {ap.address}
                      {ap.city ? `, ${ap.city}` : ""} {ap.zipCode}
                    </p>
                  </div>

                  {rescheduleId === ap.id ? (
                    <div className="space-y-3 border-t pt-3">
                      <p className="text-sm font-semibold text-gray-800">Pick a new time</p>
                      <WeekAvailabilityPicker
                        service={ap.service}
                        selectedDate={pickerDate}
                        selectedSlotKey={pickerSlotKey}
                        onSelectDate={(date) => {
                          setPickerDate(date);
                          setPickerSlotKey("");
                        }}
                        onSelectSlot={selectSlot}
                      />
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={!pickerSlotKey || apptBusy === ap.id}
                          onClick={() => void handleReschedule(ap.id)}
                          className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white disabled:opacity-50"
                        >
                          Confirm new time
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleId(null);
                            setPickerSlotKey("");
                          }}
                          className="text-sm text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleId(ap.id);
                          setPickerSlotKey("");
                        }}
                        className="text-sm font-semibold text-brand underline"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        disabled={apptBusy === ap.id}
                        onClick={() => void handleCancel(ap.id)}
                        className="text-sm font-semibold text-red-600 underline disabled:opacity-50"
                      >
                        Cancel visit
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-bold text-lg text-gray-900">Past visits</h2>
              {past.map((ap) => (
                <div key={ap.id} className="site-card p-4 opacity-80">
                  <p className="font-semibold text-gray-800">{ap.petName || "Your pet"}</p>
                  <p className="text-sm text-gray-500">
                    {formatApptDate(ap.startAt)} · {ap.groomerName}
                  </p>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
