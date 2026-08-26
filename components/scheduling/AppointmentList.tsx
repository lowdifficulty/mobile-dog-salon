"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAppointmentTitle, getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { formatPetNames, getAppointmentPets } from "@/lib/booking/pets";
import { GROOMERS, groomerClientDisplayName } from "@/lib/scheduling/groomers";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import WeekAvailabilityPicker from "@/components/scheduling/WeekAvailabilityPicker";
import StaffDateTimePicker, {
  buildSlotKey,
} from "@/components/scheduling/StaffDateTimePicker";
import type { Appointment, AvailableSlot, GroomerId } from "@/lib/scheduling/types";
import {
  canStaffManageAppointment,
  type StaffAppointmentFilter,
} from "@/lib/scheduling/appointment-filters";
import SendToGroomerButton from "@/components/staff/SendToGroomerButton";
import {
  groomerAppointmentCardClass,
  groomerAppointmentLeftBorderClass,
  groomerAppointmentLegendDotClass,
  groomerAppointmentLegendLabel,
} from "@/lib/scheduling/groomer-crm-colors";
import AppointmentAddressActions from "@/components/scheduling/AppointmentAddressActions";
import AppointmentPhoneActions from "@/components/scheduling/AppointmentPhoneActions";
import LeadDetailsEditor, {
  leadToFormValues,
  type LeadDetailsFormValues,
} from "@/components/leads/LeadDetailsEditor";
import AppointmentPaymentModal from "@/components/payments/AppointmentPaymentModal";
import AppointmentMessageButton from "@/components/scheduling/AppointmentMessageButton";

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

function formatBookedAt(createdAt: string) {
  return new Date(createdAt).toLocaleString("en-US", {
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
  allowDelete = false,
  colorByGroomer: colorByGroomerProp,
  onOpenConversation,
}: {
  apiUrl: string;
  filter: StaffAppointmentFilter;
  currentGroomerId?: GroomerId;
  allowOverrideAvailability?: boolean;
  allowDelete?: boolean;
  colorByGroomer?: boolean;
  onOpenConversation?: (contactId: string) => void;
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
  const [payAppointment, setPayAppointment] = useState<Appointment | null>(null);

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

  async function handleDelete(ap: Appointment) {
    const ok = window.confirm(
      `Permanently delete ${formatPetNames(getAppointmentPets(ap))}'s appointment on ${formatWhen(ap.startAt)}? This cannot be undone.`
    );
    if (!ok) return;

    setBusyId(ap.id);
    setActionError(null);
    try {
      const res = await fetch(`${manageApiBase}/${ap.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      closeReschedule();
      closeEditLead();
      await loadAppointments();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Delete failed");
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
        {filter === "upcoming"
          ? "No upcoming appointments."
          : filter === "past"
            ? "No past appointments yet."
            : filter === "recent"
              ? "No appointments yet."
              : "No appointments yet."}
      </p>
    );
  }

  const useGroomerColors =
    colorByGroomerProp ??
    (Boolean(currentGroomerId) &&
      (filter === "upcoming" || filter === "all" || filter === "recent"));
  const legendGroomerIds = useGroomerColors
    ? currentGroomerId
      ? (Object.keys(GROOMERS) as GroomerId[]).filter((id) => id !== currentGroomerId)
      : (Object.keys(GROOMERS) as GroomerId[])
    : [];

  return (
    <div className="space-y-1.5">
      {useGroomerColors && (
        <p className="text-xs text-gray-500 mb-2 flex flex-wrap gap-x-3 gap-y-1">
          {currentGroomerId && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(currentGroomerId)}`}
                aria-hidden
              />
              My appointments
            </span>
          )}
          {legendGroomerIds.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(id)}`}
                aria-hidden
              />
              {groomerAppointmentLegendLabel(id)}
              {id === "melanie" && " (green)"}
              {id === "jessica" && " (blue)"}
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
        const appointmentTitle = formatAppointmentTitle(ap);
        const isRescheduling = rescheduleId === ap.id;
        const isEditingLead = editLeadAppointmentId === ap.id;
        const isBusy = busyId === ap.id;
        const isOwnAppointment = currentGroomerId && ap.groomerId === currentGroomerId;
        const cardAccentClass = groomerAppointmentCardClass(ap.groomerId, {
          isOwn: Boolean(isOwnAppointment),
          cancelled: ap.status === "cancelled",
          colorByGroomer: useGroomerColors,
        });
        const leftBorderClass = useGroomerColors
          ? groomerAppointmentLeftBorderClass(ap.groomerId)
          : "border-l-gray-300";

        const canManage =
          canStaffManageAppointment(ap, filter) &&
          (!currentGroomerId || ap.groomerId === currentGroomerId);
        const showActions = canManage || allowDelete;

        return (
          <div
            key={ap.id}
            className={`rounded-lg border border-l-4 px-3 py-2.5 shadow-sm ${leftBorderClass} ${cardAccentClass}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-gray-900">{formatWhen(ap.startAt)}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(ap.groomerId)}`}
                      aria-hidden
                    />
                    {GROOMERS[ap.groomerId].name}
                  </span>
                  {ap.status === "cancelled" && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Cancelled
                    </span>
                  )}
                  {filter === "recent" && (
                    <span className="text-[11px] text-gray-400">
                      booked {formatBookedAt(ap.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 leading-snug mt-0.5">
                  <span className="font-medium">{appointmentTitle}</span>
                  {(ap.petName?.trim() || ap.petBreed) && (
                    <span className="text-gray-600">
                      {" "}
                      · {ap.petName?.trim()}
                      {ap.petBreed ? ` (${ap.petBreed})` : ""}
                    </span>
                  )}
                </p>
                <dl className="mt-1.5 space-y-1 text-xs text-gray-700">
                  <div>
                    <dt className="sr-only">Client</dt>
                    <dd>
                      <span className="font-semibold text-gray-800">Client:</span>{" "}
                      {ap.firstName} {ap.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Phone</dt>
                    <dd>
                      <AppointmentPhoneActions phone={ap.phone} />
                    </dd>
                  </div>
                  {ap.service?.trim() && (
                    <div>
                      <dt className="sr-only">Service</dt>
                      <dd>
                        <span className="font-semibold text-gray-800">Service:</span> {ap.service}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="sr-only">Address</dt>
                    <dd>
                      <AppointmentAddressActions address={formatAppointmentAddress(ap)} />
                    </dd>
                  </div>
                </dl>
                {ap.notes && (
                  <p className="text-xs text-gray-600 mt-1.5 whitespace-pre-wrap break-words">
                    <span className="font-semibold text-gray-800">Notes:</span> {ap.notes}
                  </p>
                )}
              </div>
            </div>

            {showActions && (
              <div className="mt-1.5 pt-1.5 border-t border-black/[0.04]">
                {isEditingLead && canManage ? (
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
                ) : !isRescheduling && canManage ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center text-xs">
                    {ap.status !== "cancelled" && getAppointmentBookedPrice(ap) != null && (
                      <button
                        type="button"
                        onClick={() => setPayAppointment(ap)}
                        disabled={isBusy}
                        className="font-semibold text-brand hover:text-accent disabled:opacity-50"
                      >
                        Pay
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditLead(ap)}
                      disabled={isBusy}
                      className="font-semibold text-gray-600 hover:text-brand disabled:opacity-50"
                    >
                      Edit client
                    </button>
                    {onOpenConversation && (
                      <AppointmentMessageButton
                        appointmentId={ap.id}
                        onOpenConversation={onOpenConversation}
                        disabled={isBusy}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => openReschedule(ap)}
                      disabled={isBusy}
                      className="font-semibold text-gray-600 hover:text-brand disabled:opacity-50"
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
                      className="font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {isBusy ? "Working…" : "Cancel"}
                    </button>
                    {allowDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(ap)}
                        disabled={isBusy}
                        className="font-semibold text-red-700 hover:text-red-900 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ) : isRescheduling && canManage ? (
                  <div className="space-y-4">
                    <p className="text-sm font-semibold text-gray-800">Pick a new time</p>
                    {allowOverrideAvailability ? (
                      <StaffDateTimePicker
                        groomerId={rescheduleGroomerId || ap.groomerId}
                        selectedDate={rescheduleDate}
                        selectedTime={rescheduleTime}
                        excludeAppointmentId={ap.id}
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
                ) : allowDelete ? (
                  <div className="flex flex-wrap gap-3 items-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(ap)}
                      disabled={isBusy}
                      className="text-sm font-semibold text-red-800 hover:text-red-950 underline disabled:opacity-50"
                    >
                      {isBusy ? "Working…" : "Delete"}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
      {payAppointment && (
        <AppointmentPaymentModal
          appointment={payAppointment}
          onClose={() => setPayAppointment(null)}
          onPaid={() => setPayAppointment(null)}
        />
      )}
    </div>
  );
}
