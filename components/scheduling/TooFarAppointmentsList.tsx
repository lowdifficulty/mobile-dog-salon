"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPetNames, getAppointmentPets } from "@/lib/booking/pets";
import { GROOMERS } from "@/lib/scheduling/groomers";
import AppointmentAddressActions from "@/components/scheduling/AppointmentAddressActions";
import type { TooFarAppointmentEntry } from "@/lib/scheduling/too-far-appointments";
import type { GroomerId } from "@/lib/scheduling/types";
import {
  groomerAppointmentCardClass,
  groomerAppointmentLeftBorderClass,
  groomerAppointmentLegendDotClass,
} from "@/lib/scheduling/groomer-crm-colors";

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

export default function TooFarAppointmentsList({
  apiUrl,
  refreshKey = 0,
  currentGroomerId,
  colorByGroomer = false,
}: {
  apiUrl: string;
  refreshKey?: number;
  currentGroomerId?: GroomerId;
  colorByGroomer?: boolean;
}) {
  const [entries, setEntries] = useState<TooFarAppointmentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const manageApiBase = apiUrl.split("?")[0];

  const listUrl = useMemo(() => {
    const url = new URL(apiUrl, "http://local");
    url.searchParams.set("filter", "tooFar");
    return `${url.pathname}${url.search}`;
  }, [apiUrl]);

  const loadEntries = useCallback(() => {
    setLoading(true);
    return fetch(listUrl)
      .then((r) => r.json())
      .then((d) => setEntries(d.tooFar ?? []))
      .finally(() => setLoading(false));
  }, [listUrl]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshKey]);

  async function handleCancel(entry: TooFarAppointmentEntry) {
    const ap = entry.appointment;
    const ok = window.confirm(
      `Cancel ${formatPetNames(getAppointmentPets(ap))}'s appointment on ${formatWhen(ap.startAt)}?`
    );
    if (!ok) return;

    setBusyId(entry.id);
    setActionError(null);
    try {
      const res = await fetch(`${manageApiBase}/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Cancel failed");
      await loadEntries();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <p className="text-gray-500 text-sm">
        Checking upcoming appointments against groomer home bases…
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-8 text-center">
        No upcoming appointments are too far from a groomer home base.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-2">
        Confirmed upcoming visits farther than each groomer&apos;s max one-way drive from their
        home base (Jessica: Anaheim · Melanie: Garden Grove · Diamond: depot). Distances use
        driving estimates.
      </p>
      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {actionError}
        </p>
      )}
      {entries.map((entry) => {
        const isBusy = busyId === entry.id;
        const isOwnAppointment = currentGroomerId && entry.groomerId === currentGroomerId;
        const canCancel = !currentGroomerId || entry.groomerId === currentGroomerId;
        const cardAccentClass = groomerAppointmentCardClass(entry.groomerId, {
          isOwn: Boolean(isOwnAppointment),
          cancelled: false,
          colorByGroomer,
        });
        const leftBorderClass = colorByGroomer
          ? groomerAppointmentLeftBorderClass(entry.groomerId)
          : "border-l-gray-300";

        return (
          <div
            key={entry.id}
            className={`rounded-lg border border-l-4 px-3 py-2.5 shadow-sm ${leftBorderClass} ${cardAccentClass}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatWhen(entry.startAt)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(entry.groomerId)}`}
                      aria-hidden
                    />
                    {GROOMERS[entry.groomerId].name}
                  </span>
                </div>
                <dl className="mt-1.5 space-y-1 text-xs text-gray-700">
                  <div>
                    <dt className="sr-only">Client</dt>
                    <dd>
                      <span className="font-semibold text-gray-800">Client:</span>{" "}
                      {entry.clientName}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Address</dt>
                    <dd>
                      <AppointmentAddressActions address={entry.address} />
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Distance</dt>
                    <dd>
                      <span className="font-semibold text-gray-800">Distance from base:</span>{" "}
                      {entry.distanceMiles} mi (max {entry.maxMiles} mi from {entry.homeBaseLabel})
                      {entry.estimateSource === "estimate" && (
                        <span className="text-gray-500"> · approximate</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            {canCancel && (
              <div className="mt-1.5 pt-1.5 border-t border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => handleCancel(entry)}
                  disabled={isBusy}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {isBusy ? "Working…" : "Cancel appointment"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
