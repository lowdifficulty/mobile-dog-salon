"use client";

import { useCallback, useEffect, useState } from "react";
import type { MassSmsEligibleContact, MassSmsStatus } from "@/lib/mass-sms/types";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function MassSmsPanel() {
  const [contacts, setContacts] = useState<MassSmsEligibleContact[]>([]);
  const [status, setStatus] = useState<MassSmsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mass-sms");
      if (!res.ok) throw new Error("Could not load Mass SMS queue");
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setStatus(data.status ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendBatch() {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/mass-sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchSize: 3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");

      const sentCount = data.sent?.length ?? 0;
      const failedCount = data.failed?.length ?? 0;
      setMessage(
        `Sent ${sentCount} message${sentCount === 1 ? "" : "s"}` +
          (failedCount > 0 ? ` · ${failedCount} failed` : "") +
          (data.remaining != null ? ` · ${data.remaining} still pending this week` : "")
      );
      setStatus(data.status ?? null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading re-engagement queue…</p>;
  }

  const pending = contacts.filter((c) => !c.sentThisWeek);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="site-heading-section text-xl">Mass SMS — re-engagement</h2>
        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
          Clients who completed a groom 21+ days ago, opted in to SMS, and have no upcoming
          appointment. Sends slowly in small batches (3 per click, ~2.5s apart) to reduce Twilio
          spam risk. Already messaged this week stay off the queue until next Monday.
        </p>
      </div>

      {status && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="site-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Eligible</p>
            <p className="text-2xl font-bold text-brand mt-1">{status.eligibleCount}</p>
          </div>
          <div className="site-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pending this week
            </p>
            <p className="text-2xl font-bold text-brand mt-1">{status.pendingCount}</p>
          </div>
          <div className="site-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Sent this week
            </p>
            <p className="text-2xl font-bold text-brand mt-1">{status.sentThisWeekCount}</p>
          </div>
          <div className="site-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Campaign week
            </p>
            <p className="text-lg font-bold text-brand mt-1">{status.campaignWeek}</p>
            {status.lastBatchAt && (
              <p className="text-xs text-gray-500 mt-1">Last batch {formatWhen(status.lastBatchAt)}</p>
            )}
          </div>
        </div>
      )}

      <div className="site-card p-4 space-y-3">
        <h3 className="font-bold text-brand">Message preview</h3>
        <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-xl bg-gray-50 p-3 border border-gray-100">
          {status?.messagePreview ?? "—"}
        </p>
        <button
          type="button"
          onClick={() => void sendBatch()}
          disabled={sending || pending.length === 0}
          className="site-btn"
        >
          {sending
            ? "Sending batch…"
            : pending.length === 0
              ? "No pending contacts"
              : `Send next batch (${Math.min(3, pending.length)})`}
        </button>
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="site-card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
          <h3 className="font-bold text-brand">Queue ({contacts.length})</h3>
          <button type="button" onClick={() => void load()} className="text-sm font-semibold text-brand hover:underline">
            Refresh
          </button>
        </div>
        {contacts.length === 0 ? (
          <p className="p-4 text-sm text-gray-500">No eligible clients right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2">Client</th>
                  <th className="px-4 py-2">Pet</th>
                  <th className="px-4 py-2">Last groomer</th>
                  <th className="px-4 py-2">Days since visit</th>
                  <th className="px-4 py-2">This week</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.phoneKey} className="border-t border-gray-100">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">
                        {c.firstName} {c.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{c.phone}</div>
                    </td>
                    <td className="px-4 py-2">{c.petName || "—"}</td>
                    <td className="px-4 py-2">{c.groomerName}</td>
                    <td className="px-4 py-2">{c.daysSinceVisit}</td>
                    <td className="px-4 py-2">
                      {c.sentThisWeek ? (
                        <span className="text-emerald-700 font-medium">
                          Sent{c.sentAt ? ` · ${formatWhen(c.sentAt)}` : ""}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
