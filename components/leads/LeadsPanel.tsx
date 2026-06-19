"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPhoneDisplay } from "@/lib/leads/normalize";
import { LEAD_FUNNEL_STEPS, type LeadFunnelStep } from "@/lib/leads/types";
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
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  discountActive?: boolean;
  lastAppointmentAt?: string;
  scheduledAt?: string;
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

export default function LeadsPanel() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadLeads = useCallback(() => {
    setLoading(true);
    setError(null);
    return fetch("/api/admin/leads")
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((d) => setLeads(d.leads ?? []))
      .catch(() => setError("Could not load leads."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

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

  if (loading) {
    return <p className="text-sm text-gray-500">Loading leads…</p>;
  }

  if (error && leads.length === 0) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (leads.length === 0) {
    return (
      <p className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-6">
        No leads yet. They appear here when someone starts the booking flow, submits the
        contact form, or completes an appointment.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {leads.length} lead{leads.length === 1 ? "" : "s"} · Green rows are ready for
          follow-up (2+ weeks after last appointment)
        </p>
        <button
          type="button"
          onClick={() => loadLeads()}
          className="text-sm font-semibold text-brand hover:text-accent"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3">
        {leads.map((lead) => {
          const expanded = expandedId === lead.id;
          const followUp = lead.followUpDue;

          return (
            <article
              key={lead.id}
              className={`rounded-xl border overflow-hidden ${
                followUp
                  ? "border-green-400 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : lead.id)}
                className="w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {lead.phone ? formatPhoneDisplay(lead.phone) : "No phone"}
                    </p>
                    {followUp && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-green-800 bg-green-200 px-2 py-0.5 rounded-full">
                        Follow up
                      </span>
                    )}
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
                      <span className="text-gray-400">Pet:</span>{" "}
                      {lead.petName
                        ? `${lead.petName}${lead.petSize ? ` (${lead.petSize})` : ""}`
                        : "—"}
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
                        disabled={savingId === lead.id}
                        onClick={() => addNote(lead.id)}
                        className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
