"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getServiceLabel } from "@/lib/pricing";
import { formatPetNames, formatPetsList, getAppointmentPets } from "@/lib/booking/pets";
import { GROOMERS, groomerClientDisplayName } from "@/lib/scheduling/groomers";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import WeekAvailabilityPicker from "@/components/scheduling/WeekAvailabilityPicker";
import StaffDateTimePicker, {
  buildSlotKey,
} from "@/components/scheduling/StaffDateTimePicker";
import type { Appointment, AvailableSlot, GroomerId } from "@/lib/scheduling/types";
import SendToGroomerButton from "@/components/staff/SendToGroomerButton";
import {
  groomerAppointmentCardClass,
  groomerAppointmentLegendDotClass,
  groomerAppointmentLegendLabel,
} from "@/lib/scheduling/groomer-crm-colors";
import LeadDetailsEditor, {
  leadToFormValues,
  type LeadDetailsFormValues,
} from "@/components/leads/LeadDetailsEditor";

const LEADS_API = "/api/staff/leads";

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
  currentGroomerId,
  allowOverrideAvailability = false,
}: {
  apiUrl: string;
  filter: "upcoming" | "past";
  currentGroomerId?: GroomerId;
  allowOverrideAvailability?: boolean;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [rescheduleGroomerId, setRescheduleGroomerId] = useState<GroomerId | "">("");
  const [rescheduleSlotKey, setRescheduleSlotKey] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editLeadAppointmentId, setEditLeadAppointmentId] = useState<string | null>(null);
  const [leadFormValues, setLeadFormValues] = useState<LeadDetailsFormValues | null>(null);
  const [leadFormLoading, setLeadFormLoading] = useState(false);

  const manageApiBase = apiUrl.split("?")[0];

  const listUrl = useMemo(() => {
    const url = new URL(apiUrl, "http://local");
    url.searchParams.set("filter", filter);
    return `${url.pathname}${url.search}`;
  }, [apiUrl, filter]);

  const loadAppointments = useCallback(() => {
    setLoading(true);
    return fetch(listUrl)
      .then((r) => r.json())
      .then((d) => setAppointments(d.appointments ?? []))
      .finally(() => setLoading(false));
  }, [listUrl]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  function openReschedule(ap: Appointment) {
    setActionError(null);
    closeEditLead();
    setRescheduleId(ap.id);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleGroomerId(ap.groomerId);
    setRescheduleSlotKey("");
  }

  function closeReschedule() {
    setRescheduleId(null);
    setRescheduleDate("");
    setRescheduleTime("");
    setRescheduleGroomerId("");
    setRescheduleSlotKey("");
  }

  function closeEditLead() {
    setEditLeadAppointmentId(null);
    setLeadFormValues(null);
  }

  async function openEditLead(ap: Appointment) {
    setActionError(null);
    closeReschedule();
    setEditLeadAppointmentId(ap.id);
    setLeadFormLoading(true);
    setLeadFormValues(null);

    try {
      const res = await fetch(`${LEADS_API}/lookup?appointmentId=${encodeURIComponent(ap.id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load client details");
      setLeadFormValues(leadToFormValues(data));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not load client details");
      closeEditLead();
    } finally {
      setLeadFormLoading(false);
    }
  }

  async function saveLeadFromAppointment(appointmentId: string, values: LeadDetailsFormValues) {
    setBusyId(appointmentId);
    setActionError(null);
    try {
      const res = await fetch(`${LEADS_API}/by-appointment/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save client details");
      closeEditLead();
      await loadAppointments();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save client details");
    } finally {
      setBusyId(null);
    }
  }

  function selectRescheduleSlot(slot: AvailableSlot) {
    setRescheduleSlotKey(slot.slotKey);
    setRescheduleDate(slot.date);
    setActionError(null);
  }

  async function handleCancel(ap: Appointment) {
    const ok = window.confirm(
      `Cancel ${formatPetNames(getAppointmentPets(ap))}'s appointment on ${formatWhen(ap.startAt)}?`
    );
    if (!ok) return;

    setBusyId(ap.id);
    setActionError(null);
    try {
      const res = await fetch(`${manageApiBase}/${ap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cancel failed");
      closeReschedule();
      await loadAppointments();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReschedule(ap: Appointment) {
    const slotKey =
      allowOverrideAvailability && rescheduleDate && rescheduleTime && rescheduleGroomerId
        ? buildSlotKey(rescheduleGroomerId, rescheduleDate, rescheduleTime)
        : rescheduleSlotKey;

    if (!slotKey) {
      setActionError("Pick a new date and time first.");
      return;
    }

    setBusyId(ap.id);
    setActionError(null);
    try {
      const res = await fetch(`${manageApiBase}/${ap.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          slotKey,
          overrideAvailability: allowOverrideAvailability || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reschedule failed");
      closeReschedule();
      await loadAppointments();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Reschedule failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Loading appointments…</p>;

  if (appointments.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-8 text-center">
        {filter === "upcoming" ? "No upcoming appointments." : "No past appointments yet."}
      </p>
    );
  }

  const colorByGroomer = filter === "upcoming" && currentGroomerId;
  const otherGroomerIds = colorByGroomer
    ? (Object.keys(GROOMERS) as GroomerId[]).filter((id) => id !== currentGroomerId)
    : [];

  return (
    <div className="space-y-3">
      {colorByGroomer && (
        <p className="text-sm text-gray-600 mb-4 flex flex-wrap gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" aria-hidden />
            My appointments
          </span>
          {otherGroomerIds.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(id)}`}
                aria-hidden
              />
              {groomerAppointmentLegendLabel(id)}
            </span>
          ))}
        </p>
      )}
      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {actionError}
        </p>
      )}

      {appointments.map((ap) => {
        const serviceLabel = getServiceLabel(ap.service);
        const appointmentPets = getAppointmentPets(ap);
        const petSummary = formatPetsList(appointmentPets);
        const isRescheduling = rescheduleId === ap.id;
        const isEditingLead = editLeadAppointmentId === ap.id;
        const isBusy = busyId === ap.id;
        const isOwnAppointment = currentGroomerId && ap.groomerId === currentGroomerId;
        const cardAccentClass = groomerAppointmentCardClass(ap.groomerId, {
          isOwn: Boolean(isOwnAppointment),
          cancelled: ap.status === "cancelled",
          colorByGroomer: Boolean(colorByGroomer),
        });

        return (
          <div key={ap.id} className={`site-card p-4 border-l-4 ${cardAccentClass}`}>
            <div className="flex flex-wrap justify-between gap-2 mb-2">
              <p className="font-bold text-brand">{formatWhen(ap.startAt)}</p>
              <div className="flex items-center gap-2">
                {ap.status === "cancelled" && (
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    Cancelled
                  </span>
                )}
                <p className="text-sm text-gray-500">{GROOMERS[ap.groomerId].name}</p>
              </div>
            </div>
            <p className="text-sm text-gray-800">
              <strong>{petSummary}</strong>
              {ap.petBreed ? ` (${ap.petBreed})` : ""} — {serviceLabel}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {ap.firstName} {ap.lastName} · {ap.phone}
            </p>
            <p className="text-sm text-gray-600">{formatAppointmentAddress(ap)}</p>
            {ap.notes && <p className="text-sm text-gray-500 mt-2">Notes: {ap.notes}</p>}

            {filter === "upcoming" &&
              ap.status === "confirmed" &&
              (!currentGroomerId || ap.groomerId === currentGroomerId) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                {isEditingLead ? (
                  leadFormLoading || !leadFormValues ? (
                    <p className="text-sm text-gray-500">Loading client details…</p>
                  ) : (
                    <LeadDetailsEditor
                      leadId={ap.id}
                      initial={leadFormValues}
                      busy={isBusy}
                      onSave={saveLeadFromAppointment}
                      onCancel={closeEditLead}
                    />
                  )
                ) : !isRescheduling ? (
                  <div className="flex flex-wrap gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => openEditLead(ap)}
                      disabled={isBusy}
                      className="text-sm font-semibold text-brand hover:text-accent underline disabled:opacity-50"
                    >
                      Edit client
                    </button>
                    <button
                      type="button"
                      onClick={() => openReschedule(ap)}
                      disabled={isBusy}
                      className="text-sm font-semibold text-brand hover:text-accent underline disabled:opacity-50"
                    >
                      Reschedule
                    </button>
                    <SendToGroomerButton
                      type="appointment"
                      appointmentId={ap.id}
                      currentGroomerId={currentGroomerId ?? ap.groomerId}
                      disabled={isBusy}
                      onSent={() => loadAppointments()}
                    />
                    <button
                      type="button"
                      onClick={() => handleCancel(ap)}
                      disabled={isBusy}
                      className="text-sm font-semibold text-red-600 hover:text-red-800 underline disabled:opacity-50"
                    >
                      {isBusy ? "Working…" : "Cancel"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-gray-800">Pick a new time</p>
                    {allowOverrideAvailability ? (
                      <StaffDateTimePicker
                        groomerId={rescheduleGroomerId || ap.groomerId}
                        selectedDate={rescheduleDate}
                        selectedTime={rescheduleTime}
                        onSelectDate={(date) => {
                          setRescheduleDate(date);
                          setRescheduleTime("");
                        }}
                        onSelectTime={setRescheduleTime}
                        allowGroomerPick={!currentGroomerId}
                        onSelectGroomer={setRescheduleGroomerId}
                      />
                    ) : (
                      <WeekAvailabilityPicker
                        service={ap.service}
                        selectedDate={rescheduleDate}
                        selectedSlotKey={rescheduleSlotKey}
                        onSelectDate={(date) => {
                          setRescheduleDate(date);
                          setRescheduleSlotKey("");
                        }}
                        onSelectSlot={selectRescheduleSlot}
                      />
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleReschedule(ap)}
                        disabled={
                          isBusy ||
                          (allowOverrideAvailability
                            ? !rescheduleDate || !rescheduleTime
                            : !rescheduleSlotKey)
                        }
                        className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
                      >
                        {isBusy ? "Saving…" : "Confirm new time"}
                      </button>
                      <button
                        type="button"
                        onClick={closeReschedule}
                        disabled={isBusy}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        Never mind
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
