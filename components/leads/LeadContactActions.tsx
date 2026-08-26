"use client";

import { useState } from "react";
import { formatPhoneDisplay, normalizePhone } from "@/lib/leads/normalize";
import { isScheduledLead } from "@/lib/leads/filters";
import { formatLeadAppointmentWhen } from "@/lib/leads/appointment-fields";
import { useStaffDialerPanel } from "@/lib/twilio/staff-dialer-context";
import WeekAvailabilityPicker from "@/components/scheduling/WeekAvailabilityPicker";
import type { GroomerId } from "@/lib/scheduling/types";

import type { LeadFunnelStep } from "@/lib/leads/types";

type LeadForActions = {
  id: string;
  phone: string;
  funnelStep: LeadFunnelStep;
  appointmentId?: string;
  appointmentStartAt?: string;
  groomerId?: GroomerId;
  groomerName?: string;
  service?: string;
  followUpMode: "fu" | "chill";
};

function phoneE164(phone: string): string | null {
  const digits = normalizePhone(phone);
  if (digits.length !== 10) return null;
  return `+1${digits}`;
}

export default function LeadContactActions({
  lead,
  appointmentsApiBase,
  onOpenConversation,
  onActionComplete,
  allowOverrideAvailability = false,
}: {
  lead: LeadForActions;
  appointmentsApiBase: string;
  onOpenConversation?: (contactId: string) => void;
  onActionComplete?: () => void;
  allowOverrideAvailability?: boolean;
}) {
  const { openDialer } = useStaffDialerPanel();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleSlotKey, setRescheduleSlotKey] = useState("");

  const e164 = phoneE164(lead.phone);
  const displayPhone = formatPhoneDisplay(lead.phone);
  const hasScheduledAppt = isScheduledLead(lead) && Boolean(lead.appointmentId);

  async function openMessages() {
    if (!onOpenConversation || busy) return;
    setBusy(true);
    setError(null);
    try {
      const params = lead.appointmentId
        ? `appointmentId=${encodeURIComponent(lead.appointmentId)}`
        : `phone=${encodeURIComponent(lead.phone)}`;
      const res = await fetch(`/api/admin/crm/contacts/from-appointment?${params}`);
      const data = (await res.json()) as { contactId?: string; error?: string };
      if (!res.ok || !data.contactId) {
        throw new Error(data.error ?? "Could not open messages");
      }
      onOpenConversation(data.contactId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open messages");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!lead.appointmentId) return;
    const when = lead.appointmentStartAt
      ? formatLeadAppointmentWhen(lead.appointmentStartAt, lead.groomerName)
      : "this appointment";
    const ok = window.confirm(`Cancel ${when}?`);
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${appointmentsApiBase}/${lead.appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cancel failed");
      setRescheduling(false);
      onActionComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReschedule() {
    if (!lead.appointmentId || !rescheduleSlotKey) {
      setError("Pick a new date and time first.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${appointmentsApiBase}/${lead.appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          slotKey: rescheduleSlotKey,
          overrideAvailability: allowOverrideAvailability || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reschedule failed");
      setRescheduling(false);
      setRescheduleDate("");
      setRescheduleSlotKey("");
      onActionComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reschedule failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Contact</p>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {e164 && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => openDialer(lead.phone)}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
            >
              Call
            </button>
            <a
              href={`sms:${e164}`}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
            >
              Text {displayPhone}
            </a>
          </>
        )}
        {onOpenConversation && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void openMessages()}
            className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-brand text-brand hover:bg-brand/5 disabled:opacity-50"
          >
            {busy ? "Opening…" : "Messages"}
          </button>
        )}
        {hasScheduledAppt && !rescheduling && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setRescheduling(true);
              }}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50"
            >
              Reschedule
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCancel()}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Cancel appointment
            </button>
          </>
        )}
      </div>

      {rescheduling && lead.appointmentId && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-sm font-semibold text-gray-800">Pick a new time</p>
          <WeekAvailabilityPicker
            service={lead.service ?? "full_groom"}
            selectedDate={rescheduleDate}
            selectedSlotKey={rescheduleSlotKey}
            onSelectDate={(date) => {
              setRescheduleDate(date);
              setRescheduleSlotKey("");
            }}
            onSelectSlot={(slot) => {
              setRescheduleSlotKey(slot.slotKey);
              setRescheduleDate(slot.date);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !rescheduleSlotKey}
              onClick={() => void handleReschedule()}
              className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Saving…" : "Confirm new time"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setRescheduling(false);
                setRescheduleDate("");
                setRescheduleSlotKey("");
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Never mind
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
