"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { groupAvailableVanTimeslots, hoursForBlockCount } from "@/lib/scheduling/available-slot-groups";
import type { AvailableVanTimeslot } from "@/lib/scheduling/van-capacity";

type VanSummary = {
  availableTimeslots: AvailableVanTimeslot[];
  availableCount: number;
};

type TimeslotView = "shifts" | "singles";

function slotKey(date: string, time: string): string {
  return `${date}|${time}`;
}

function slotKeys(slots: { date: string; time: string }[]): string[] {
  return slots.map((slot) => slotKey(slot.date, slot.time));
}

function ToggleButton({
  queued,
  onClick,
  label,
}: {
  queued: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={queued ? "Remove from calendar (not saved yet)" : "Add to the calendar below"}
      aria-label={label}
      className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full border text-lg font-bold leading-none transition-colors ${
        queued
          ? "border-brand bg-brand text-white hover:bg-red-600 hover:border-red-600"
          : "border-gray-200 bg-white text-brand hover:border-brand hover:bg-brand hover:text-white"
      }`}
    >
      {queued ? "✓" : "+"}
    </button>
  );
}

function formatHoursLabel(hours: number): string {
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** Navy background/border scales with shift length (3h → 12h). */
function navyShadeClasses(hours: number): string {
  switch (hours) {
    case 3:
      return "border-[#b8c9de] bg-[#e8eef5]";
    case 6:
      return "border-[#8fa8c4] bg-[#d0dce9]";
    case 9:
      return "border-[#6d8ab0] bg-[#b8c9de]";
    case 12:
      return "border-[#5578a0] bg-[#9bb0cc]";
    default:
      return "border-[#b8c9de] bg-[#e8eef5]";
  }
}

function TimeslotRow({
  displayDate,
  displayTime,
  hours,
  detail,
  queued,
  onToggle,
  toggleLabel,
}: {
  displayDate: string;
  displayTime: string;
  hours: number;
  detail?: string;
  queued: boolean;
  onToggle: () => void;
  toggleLabel: string;
}) {
  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm text-brand transition-[background-color,border-color,filter] md:hover:brightness-[0.97] ${navyShadeClasses(hours)}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <span className="font-semibold text-brand">{displayDate}</span>
          <span className="rounded-full bg-white/85 px-2 py-0.5 text-xs font-bold text-brand">
            {formatHoursLabel(hours)}
          </span>
          <span className="text-brand-dark/90">{displayTime}</span>
        </div>
        {detail && <p className="mt-0.5 text-xs text-brand-dark/75">{detail}</p>}
      </div>
      <ToggleButton queued={queued} onClick={onToggle} label={toggleLabel} />
    </li>
  );
}

export default function VanCapacityOverview({
  apiBase = "/api/staff/van-capacity",
  onToggleTimeslots,
  pendingSlotKeys = [],
}: {
  apiBase?: string;
  /** Toggle one or more open van timeslots on the shift calendar (before save). */
  onToggleTimeslots?: (slots: { date: string; time: string }[]) => void;
  /** Slots queued in the editor but not saved yet. */
  pendingSlotKeys?: string[];
}) {
  const [summary, setSummary] = useState<VanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [view, setView] = useState<TimeslotView>("shifts");

  const pending = useMemo(() => new Set(pendingSlotKeys), [pendingSlotKeys]);

  const shiftGroups = useMemo(
    () => (summary ? groupAvailableVanTimeslots(summary.availableTimeslots) : []),
    [summary]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const res = await fetch(apiBase);
    if (!res.ok) {
      setMessage(
        res.status === 401
          ? "Session expired — please sign in again."
          : "Could not load van capacity."
      );
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSummary({
      availableTimeslots: data.availableTimeslots ?? [],
      availableCount: data.availableCount ?? 0,
    });
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    load();
  }, [load]);

  function isQueued(slots: { date: string; time: string }[]): boolean {
    const keys = slotKeys(slots);
    return keys.length > 0 && keys.every((key) => pending.has(key));
  }

  if (loading) {
    return (
      <section className="site-card p-5">
        <p className="text-sm text-gray-500">Loading available timeslots…</p>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="site-card p-5">
        <p className="text-sm text-red-600">{message || "Could not load van capacity."}</p>
      </section>
    );
  }

  return (
    <section className="site-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-3 shrink-0">
        <h4 className="text-base font-bold text-brand">Available timeslots</h4>
        <span className="text-xs font-semibold text-gray-500">
          {summary.availableCount} open (next 30 days)
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="inline-flex rounded-full border border-gray-200 bg-white p-0.5">
          {(["shifts", "singles"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                view === mode
                  ? "bg-brand text-white"
                  : "text-brand hover:bg-gray-50"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          {view === "shifts"
            ? "Darker navy = more hours (3–12)"
            : "Each open block is 3 hours"}
        </p>
      </div>

      <p className="text-xs text-gray-500 mb-3 shrink-0">
        Click + to add, ✓ to remove before saving. Hover a row on desktop to preview.
      </p>

      {summary.availableTimeslots.length === 0 ? (
        <p className="text-sm text-gray-500">No open van timeslots in the next 30 days.</p>
      ) : view === "singles" ? (
        <ul className="van-capacity-slots-list">
          {summary.availableTimeslots.map((slot) => {
            const key = slotKey(slot.date, slot.time);
            const queued = pending.has(key);
            return (
              <TimeslotRow
                key={key}
                displayDate={slot.displayDate}
                displayTime={slot.displayTime}
                hours={hoursForBlockCount(1)}
                queued={queued}
                onToggle={() => onToggleTimeslots?.([{ date: slot.date, time: slot.time }])}
                toggleLabel={
                  queued
                    ? `Remove ${slot.displayDate} ${slot.displayTime} from calendar`
                    : `Add ${slot.displayDate} ${slot.displayTime} to calendar`
                }
              />
            );
          })}
        </ul>
      ) : (
        <ul className="van-capacity-slots-list">
          {shiftGroups.map((group) => {
            const queued = isQueued(group.slots);
            const detail = group.isShift
              ? `${group.slots.length} back-to-back blocks`
              : undefined;
            return (
              <TimeslotRow
                key={group.id}
                displayDate={group.displayDate}
                displayTime={group.displayTime}
                hours={group.hours}
                detail={detail}
                queued={queued}
                onToggle={() =>
                  onToggleTimeslots?.(
                    group.slots.map((slot) => ({ date: slot.date, time: slot.time }))
                  )
                }
                toggleLabel={
                  queued
                    ? `Remove ${group.displayDate} ${group.displayTime} from calendar`
                    : `Add ${group.displayDate} ${group.displayTime} to calendar`
                }
              />
            );
          })}
        </ul>
      )}
    </section>
  );
}
