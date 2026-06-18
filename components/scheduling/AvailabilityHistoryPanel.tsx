"use client";

import { useCallback, useEffect, useState } from "react";
import { GROOMERS } from "@/lib/scheduling/groomers";
import type { AvailabilityHistoryEntry } from "@/lib/scheduling/types";

function formatWhen(at: string): string {
  return new Date(at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function actionLabel(action: AvailabilityHistoryEntry["action"]): string {
  switch (action) {
    case "groomer_erase":
      return "Calendar cleared";
    case "groomer_save":
      return "Groomer saved";
    case "booking":
      return "Booking";
    case "admin_restore":
      return "Admin restore";
    case "system_migrate":
      return "System migrate";
    case "system_init":
      return "System init";
    default:
      return action;
  }
}

export default function AvailabilityHistoryPanel() {
  const [entries, setEntries] = useState<AvailabilityHistoryEntry[]>([]);
  const [persistenceMessage, setPersistenceMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/admin/availability/history");
    if (!res.ok) {
      setMessage("Could not load history. Try signing in again.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setEntries(data.entries ?? []);
    setPersistenceMessage(data.persistence?.message ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function restore(historyId: string) {
    if (!confirm("Restore this snapshot? Current schedules will be replaced.")) return;
    setRestoringId(historyId);
    setMessage("");
    const res = await fetch("/api/admin/availability/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historyId }),
    });
    setRestoringId(null);
    if (res.ok) {
      setMessage("Calendar restored from history.");
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Restore failed.");
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading availability history…</p>;
  }

  return (
    <div className="space-y-6">
      {persistenceMessage && (
        <p className="text-sm text-gray-600 bg-section-gray border border-gray-100 rounded-xl px-4 py-3">
          {persistenceMessage}
        </p>
      )}
      {message && <p className="text-sm font-semibold text-brand">{message}</p>}

      {entries.length === 0 ? (
        <p className="text-sm text-gray-500">
          No history yet. Entries appear when groomers save, clear their calendar, book appointments,
          or you restore a snapshot.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`site-card p-4 border ${
                entry.action === "groomer_erase"
                  ? "border-red-200 bg-red-50/40"
                  : "border-gray-100"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-brand text-sm">
                    {actionLabel(entry.action)}
                    {entry.groomerId && (
                      <span className="text-gray-500 font-normal">
                        {" "}
                        · {GROOMERS[entry.groomerId].name}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{entry.summary}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatWhen(entry.at)} · {entry.actor}
                    {entry.groomerDaysBefore != null && entry.groomerDaysAfter != null && (
                      <> · days {entry.groomerDaysBefore} → {entry.groomerDaysAfter}</>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => restore(entry.id)}
                  disabled={restoringId === entry.id}
                  className="site-btn-outline text-xs shrink-0"
                >
                  {restoringId === entry.id ? "Restoring…" : "Restore this"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
