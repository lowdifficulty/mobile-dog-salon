"use client";

import { useCallback, useEffect, useState } from "react";
import { TIME_SLOT_OPTIONS, formatDisplayTime } from "@/lib/scheduling/groomers";
import type { AvailabilityDay } from "@/lib/scheduling/types";

function buildWeekdayDates(count = 45): string[] {
  const dates: string[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (dates.length < count) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) {
      dates.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function formatDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function AvailabilityEditor({
  apiBase,
  groomerId,
  readOnly = false,
}: {
  apiBase: string;
  groomerId?: string;
  readOnly?: boolean;
}) {
  const dates = buildWeekdayDates();
  const [rows, setRows] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiBase);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    const map: Record<string, string[]> = {};
    for (const a of data.availability as AvailabilityDay[]) {
      map[a.date] = [...a.times];
    }
    setRows(map);
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleDay(date: string) {
    if (readOnly) return;
    setRows((prev) => {
      const next = { ...prev };
      if (next[date]?.length) {
        delete next[date];
      } else {
        next[date] = [...TIME_SLOT_OPTIONS];
      }
      return next;
    });
  }

  function toggleTime(date: string, time: string) {
    if (readOnly) return;
    setRows((prev) => {
      const current = prev[date] ?? [];
      const has = current.includes(time);
      const times = has ? current.filter((t) => t !== time) : [...current, time].sort();
      if (times.length === 0) {
        const next = { ...prev };
        delete next[date];
        return next;
      }
      return { ...prev, [date]: times };
    });
  }

  function applyWeekdayTemplate() {
    if (readOnly) return;
    const next: Record<string, string[]> = { ...rows };
    for (const date of dates) {
      next[date] = [...TIME_SLOT_OPTIONS];
    }
    setRows(next);
    setMessage("Applied Mon–Fri 8 AM – 4 PM to all dates below. Click Save.");
  }

  async function save() {
    if (readOnly) return;
    setSaving(true);
    setMessage("");
    const availability: AvailabilityDay[] = Object.entries(rows).map(([date, times]) => ({
      groomerId: groomerId as AvailabilityDay["groomerId"],
      date,
      times,
    }));

    const res = await fetch(apiBase, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("Availability saved!");
    } else {
      setMessage("Could not save. Try again.");
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading availability…</p>;
  }

  return (
    <div>
      {!readOnly && (
        <div className="flex flex-wrap gap-3 mb-6">
          <button type="button" onClick={applyWeekdayTemplate} className="site-btn-outline text-sm">
            Quick fill: weekdays 8 AM – 4 PM
          </button>
          <button type="button" onClick={save} disabled={saving} className="site-btn text-sm">
            {saving ? "Saving…" : "Save availability"}
          </button>
        </div>
      )}
      {message && <p className="text-sm text-brand font-semibold mb-4">{message}</p>}

      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
        {dates.map((date) => {
          const active = Boolean(rows[date]?.length);
          return (
            <div key={date} className="site-card p-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => toggleDay(date)}
                  className={`text-sm font-semibold ${active ? "text-brand" : "text-gray-400"}`}
                >
                  {formatDateLabel(date)}
                  {active ? " · Working" : " · Off"}
                </button>
              </div>
              {active && (
                <div className="flex flex-wrap gap-2">
                  {TIME_SLOT_OPTIONS.map((time) => {
                    const selected = rows[date]?.includes(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={readOnly}
                        onClick={() => toggleTime(date, time)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          selected
                            ? "bg-brand text-white border-brand"
                            : "bg-white text-gray-600 border-gray-200 hover:border-accent"
                        }`}
                      >
                        {formatDisplayTime(time)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
