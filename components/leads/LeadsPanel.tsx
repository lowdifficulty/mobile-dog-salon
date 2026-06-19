"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPhoneDisplay } from "@/lib/leads/normalize";
import { isScheduledLead, type LeadCrmView } from "@/lib/leads/filters";
import {
  funnelStepOrder,
  LEAD_FUNNEL_STEPS,
  type LeadFollowUpMode,
  type LeadFunnelStep,
  type LeadListStatus,
} from "@/lib/leads/types";
import { formatLeadPets } from "@/lib/booking/pets";
import { formatLeadAppointmentWhen } from "@/lib/leads/appointment-fields";
import { getServiceLabel } from "@/lib/pricing";

interface LeadNote {
  id: string;
  text: string;
  createdAt: string;
}

interface LeadRow {
  id: string;
  phone: string;
  contactMadeAt: string;
  funnelStep: LeadFunnelStep;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  petName?: string;
  petSize?: string;
  pets?: { petName: string; petSize: string }[];
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  discountActive?: boolean;
  lastAppointmentAt?: string;
  scheduledAt?: string;
  appointmentStartAt?: string;
  groomerName?: string;
  followUpMode: LeadFollowUpMode;
  listStatus: LeadListStatus;
  notes: LeadNote[];
  source: "booking" | "contact";
  followUpDue?: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

function displayName(lead: LeadRow) {
  if (lead.fullName?.trim()) return lead.fullName;
  if (lead.firstName || lead.lastName) {
    return [lead.firstName, lead.lastName].filter(Boolean).join(" ");
  }
  return "—";
}

function rowStyle(lead: LeadRow) {
  if (isScheduledLead(lead)) {
    return "border-green-400 bg-green-50";
  }
  if (lead.followUpMode === "chill") {
    return "border-blue-300 bg-blue-50";
  }
  return "border-amber-300 bg-amber-50";
}

function FunnelProgress({ step }: { step: LeadFunnelStep }) {
  const currentOrder = LEAD_FUNNEL_STEPS.find((s) => s.id === step)?.order ?? 0;

  return (
    <div className="flex flex-wrap gap-1">
      {LEAD_FUNNEL_STEPS.map((s) => {
        const done = s.order <= currentOrder;
        const active = s.id === step;
        return (
          <span
            key={s.id}
            title={s.label}
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              active
                ? "bg-brand text-white"
                : done
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-400"
            }`}
          >
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

type LeadSort = "funnel_desc" | "funnel_asc" | "contact_desc" | "contact_asc";

const SORT_OPTIONS: { value: LeadSort; label: string }[] = [
  { value: "funnel_desc", label: "Funnel: furthest along" },
  { value: "funnel_asc", label: "Funnel: earliest step" },
  { value: "contact_desc", label: "Contact date: newest" },
  { value: "contact_asc", label: "Contact date: oldest" },
];

function sortLeads(leads: LeadRow[], sort: LeadSort): LeadRow[] {
  const sorted = [...leads];
  sorted.sort((a, b) => {
    if (sort === "funnel_desc" || sort === "funnel_asc") {
      const stepDiff = funnelStepOrder(a.funnelStep) - funnelStepOrder(b.funnelStep);
      if (stepDiff !== 0) return sort === "funnel_desc" ? -stepDiff : stepDiff;
      return new Date(b.contactMadeAt).getTime() - new Date(a.contactMadeAt).getTime();
    }
    const timeDiff =
      new Date(a.contactMadeAt).getTime() - new Date(b.contactMadeAt).getTime();
    return sort === "contact_desc" ? -timeDiff : timeDiff;
  });
  return sorted;
}

function FollowUpToggle({
  mode,
  disabled,
  onChange,
}: {
  mode: LeadFollowUpMode;
  disabled?: boolean;
  onChange: (mode: LeadFollowUpMode) => void;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs font-bold"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("fu")}
        className={`px-2.5 py-1 transition-colors ${
          mode === "fu"
            ? "bg-amber-400 text-amber-950"
            : "bg-white text-gray-500 hover:bg-amber-50"
        } disabled:opacity-50`}
      >
        FU
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange("chill")}
        className={`px-2.5 py-1 transition-colors ${
          mode === "chill"
            ? "bg-blue-500 text-white"
            : "bg-white text-gray-500 hover:bg-blue-50"
        } disabled:opacity-50`}
      >
        Chill
      </button>
    </div>
  );
}

export default function LeadsPanel() {
  const [view, setView] = useState<LeadCrmView>("active");
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<LeadSort>("funnel_desc");

  const sortedLeads = useMemo(() => sortLeads(leads, sort), [leads, sort]);

  const loadLeads = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch(`/api/admin/leads?view=${view}`)
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((d) => setLeads(d.leads ?? []))
      .catch(() => setError("Could not load leads."))
      .finally(() => setLoading(false));
  }, [view]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  async function patchLead(
    leadId: string,
    body: { followUpMode?: LeadFollowUpMode; listStatus?: LeadListStatus }
  ) {
    setSavingId(leadId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed");
      if (body.listStatus === "cold_storage" && (view === "active" || view === "scheduled")) {
        setExpandedId(null);
      }
      if (body.listStatus === "active" && view === "cold_storage") {
        setExpandedId(null);
      }
      await loadLeads();
    } catch {
      setError("Could not update lead.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteLead(leadId: string) {
    if (
      !window.confirm(
        "Delete this lead permanently? Their appointment will be cancelled and they will be removed from analytics."
      )
    ) {
      return;
    }

    setSavingId(leadId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setExpandedId(null);
      await loadLeads();
    } catch {
      setError("Could not delete lead.");
    } finally {
      setSavingId(null);
    }
  }

  async function addNote(leadId: string) {
    const text = noteDrafts[leadId]?.trim();
    if (!text) return;

    setSavingId(leadId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed");
      setNoteDrafts((prev) => ({ ...prev, [leadId]: "" }));
      await loadLeads();
      setExpandedId(leadId);
    } catch {
      setError("Could not save note.");
    } finally {
      setSavingId(null);
    }
  }

  const emptyMessage =
    view === "active"
      ? "No active leads with a phone number yet. Leads without a phone still count in Analytics."
      : view === "scheduled"
        ? "No upcoming scheduled appointments."
        : "No leads in cold storage.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => {
            setView("active");
            setExpandedId(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            view === "active"
              ? "bg-brand text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => {
            setView("scheduled");
            setExpandedId(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            view === "scheduled"
              ? "bg-brand text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Scheduled
        </button>
        <button
          type="button"
          onClick={() => {
            setView("cold_storage");
            setExpandedId(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            view === "cold_storage"
              ? "bg-brand text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Cold storage
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading leads…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-6">
          {error ?? emptyMessage}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-600">
              {leads.length} lead{leads.length === 1 ? "" : "s"} · Green = scheduled,
              yellow = FU, blue = Chill
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium text-gray-700">Sort</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as LeadSort)}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => loadLeads()}
                className="text-sm font-semibold text-brand hover:text-accent"
              >
                Refresh
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="space-y-3">
            {sortedLeads.map((lead) => {
              const expanded = expandedId === lead.id;
              const busy = savingId === lead.id;

              return (
                <article
                  key={lead.id}
                  className={`rounded-xl border overflow-hidden ${rowStyle(lead)}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : lead.id)}
                    className="w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {formatPhoneDisplay(lead.phone)}
                        </p>
                        {isScheduledLead(lead) && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-green-800 bg-green-200 px-2 py-0.5 rounded-full">
                            Scheduled
                          </span>
                        )}
                        {lead.followUpDue && lead.followUpMode === "fu" && !isScheduledLead(lead) && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                            Due
                          </span>
                        )}
                        <FollowUpToggle
                          mode={lead.followUpMode}
                          disabled={busy}
                          onChange={(mode) => patchLead(lead.id, { followUpMode: mode })}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{displayName(lead)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Contact: {formatDate(lead.contactMadeAt)}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <FunnelProgress step={lead.funnelStep} />
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-200/80 px-4 py-4 space-y-4 bg-white/60">
                      <div className="grid sm:grid-cols-2 gap-3 text-sm">
                        <p>
                          <span className="text-gray-400">Email:</span> {lead.email || "—"}
                        </p>
                        <p>
                          <span className="text-gray-400">Source:</span>{" "}
                          {lead.source === "contact" ? "Contact form" : "Booking"}
                        </p>
                        <p>
                          <span className="text-gray-400">Pets:</span> {formatLeadPets(lead)}
                        </p>
                        <p>
                          <span className="text-gray-400">Service:</span>{" "}
                          {lead.service ? getServiceLabel(lead.service) : "—"}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="text-gray-400">Address:</span>{" "}
                          {[lead.address, lead.city, lead.zipCode].filter(Boolean).join(", ") ||
                            "—"}
                        </p>
                        {lead.discountActive && (
                          <p>
                            <span className="text-gray-400">Discount:</span> 50% phone offer
                          </p>
                        )}
                        {lead.appointmentStartAt && (
                          <p>
                            <span className="text-gray-400">Appointment:</span>{" "}
                            {formatLeadAppointmentWhen(
                              lead.appointmentStartAt,
                              lead.groomerName
                            )}
                          </p>
                        )}
                        {lead.scheduledAt && (
                          <p>
                            <span className="text-gray-400">Booked:</span>{" "}
                            {formatDate(lead.scheduledAt)}
                          </p>
                        )}
                        {lead.lastAppointmentAt && (
                          <p>
                            <span className="text-gray-400">Last appointment:</span>{" "}
                            {formatShortDate(lead.lastAppointmentAt)}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                          Notes
                        </p>
                        {lead.notes.length === 0 ? (
                          <p className="text-sm text-gray-500 mb-2">No notes yet.</p>
                        ) : (
                          <ul className="space-y-2 mb-3">
                            {lead.notes.map((note) => (
                              <li
                                key={note.id}
                                className="text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
                              >
                                <p>{note.text}</p>
                                <p className="text-[11px] text-gray-400 mt-1">
                                  {formatDate(note.createdAt)}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={noteDrafts[lead.id] ?? ""}
                            onChange={(e) =>
                              setNoteDrafts((prev) => ({
                                ...prev,
                                [lead.id]: e.target.value,
                              }))
                            }
                            placeholder="e.g. Left VM, sent text follow up"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => addNote(lead.id)}
                            className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      <div
                        className="flex flex-wrap gap-2 pt-2 border-t border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {view === "active" || view === "scheduled" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => patchLead(lead.id, { listStatus: "cold_storage" })}
                            className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Move to cold storage
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => patchLead(lead.id, { listStatus: "active" })}
                            className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-brand bg-white text-brand hover:bg-brand/5 disabled:opacity-50"
                          >
                            Restore to active
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => deleteLead(lead.id)}
                          className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete permanently
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
