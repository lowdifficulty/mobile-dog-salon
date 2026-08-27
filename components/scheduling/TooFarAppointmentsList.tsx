"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GROOMERS } from "@/lib/scheduling/groomers";
import AppointmentAddressActions from "@/components/scheduling/AppointmentAddressActions";
import type {
  TooFarAppointmentEntry,
  TooFarRecommendedRoute,
  TooFarScanMeta,
} from "@/lib/scheduling/too-far-appointments";
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

function TooFarAppointmentCard({
  entry,
  currentGroomerId,
  colorByGroomer,
  busyId,
  onCancel,
  compact = false,
}: {
  entry: TooFarAppointmentEntry;
  currentGroomerId?: GroomerId;
  colorByGroomer?: boolean;
  busyId: string | null;
  onCancel: (entry: TooFarAppointmentEntry) => void;
  compact?: boolean;
}) {
  const isBusy = busyId === entry.id;
  const isOwnAppointment = currentGroomerId && entry.groomerId === currentGroomerId;
  const canCancel = !currentGroomerId || entry.groomerId === currentGroomerId;
  const cardAccentClass = groomerAppointmentCardClass(entry.groomerId, {
    isOwn: Boolean(isOwnAppointment),
    cancelled: false,
    colorByGroomer: Boolean(colorByGroomer),
  });
  const leftBorderClass = colorByGroomer
    ? groomerAppointmentLeftBorderClass(entry.groomerId)
    : "border-l-gray-300";

  return (
    <div
      className={`rounded-lg border border-l-4 px-3 shadow-sm ${leftBorderClass} ${cardAccentClass} ${
        compact ? "py-2" : "py-2.5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-semibold text-gray-900">{formatWhen(entry.startAt)}</span>
            {!compact && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(entry.groomerId)}`}
                  aria-hidden
                />
                {GROOMERS[entry.groomerId].name}
              </span>
            )}
          </div>
          <dl className="mt-1.5 space-y-1 text-xs text-gray-700">
            <div>
              <dt className="sr-only">Client</dt>
              <dd>
                <span className="font-semibold text-gray-800">Client:</span> {entry.clientName}
                {entry.petName ? ` · ${entry.petName}` : ""}
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
              </dd>
            </div>
          </dl>
        </div>
      </div>
      {canCancel && (
        <div className="mt-1.5 pt-1.5 border-t border-black/[0.04]">
          <button
            type="button"
            onClick={() => onCancel(entry)}
            disabled={isBusy}
            className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
          >
            {isBusy ? "Working…" : "Cancel appointment"}
          </button>
        </div>
      )}
    </div>
  );
}

function RecommendedRouteCard({
  route,
  currentGroomerId,
  colorByGroomer,
  busyId,
  onCancel,
}: {
  route: TooFarRecommendedRoute;
  currentGroomerId?: GroomerId;
  colorByGroomer?: boolean;
  busyId: string | null;
  onCancel: (entry: TooFarAppointmentEntry) => void;
}) {
  const dayLabel =
    route.uniqueDays === 1 ? "1 day" : `${route.uniqueDays} different days`;
  const consolidationHint =
    route.uniqueDays > 1
      ? "Call clients to consolidate these visits onto one day."
      : "Multiple nearby too-far visits — consider keeping them on the same route day.";

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2.5">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-bold text-amber-950">Recommended route · {route.areaLabel}</h3>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-900/80">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(route.groomerId)}`}
              aria-hidden
            />
            {GROOMERS[route.groomerId].name}
          </span>
        </div>
        <p className="text-xs text-amber-900/90">
          {route.appointmentCount} nearby visits within ~{route.clusterSpreadMiles} mi of each other
          on {dayLabel}. {consolidationHint}
        </p>
      </div>
      <div className="space-y-1.5">
        {route.appointments.map((entry) => (
          <TooFarAppointmentCard
            key={entry.id}
            entry={entry}
            currentGroomerId={currentGroomerId}
            colorByGroomer={colorByGroomer}
            busyId={busyId}
            onCancel={onCancel}
            compact
          />
        ))}
      </div>
    </section>
  );
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
  const [routes, setRoutes] = useState<TooFarRecommendedRoute[]>([]);
  const [isolated, setIsolated] = useState<TooFarAppointmentEntry[]>([]);
  const [meta, setMeta] = useState<TooFarScanMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    setLoadError(null);
    return fetch(listUrl)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load Too Far list");
        setRoutes(d.routes ?? []);
        setIsolated(d.isolated ?? d.tooFar ?? []);
        setMeta(d.meta ?? null);
      })
      .catch((err) => {
        setRoutes([]);
        setIsolated([]);
        setMeta(null);
        setLoadError(err instanceof Error ? err.message : "Could not load Too Far list");
      })
      .finally(() => setLoading(false));
  }, [listUrl]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, refreshKey]);

  async function handleCancel(entry: TooFarAppointmentEntry) {
    const ok = window.confirm(
      `Cancel ${entry.petName}'s appointment on ${formatWhen(entry.startAt)}?`
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

  const totalCount = routes.reduce((sum, route) => sum + route.appointmentCount, 0) + isolated.length;

  if (loading) {
    return (
      <p className="text-gray-500 text-sm">
        Checking upcoming appointments against groomer home bases…
      </p>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {loadError}
        </p>
        <button
          type="button"
          onClick={() => void loadEntries()}
          className="text-sm font-semibold text-brand hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500 mb-2">
        Future confirmed visits farther than <strong>8 mi</strong> (estimated drive) from each
        groomer&apos;s home base — Jessica: Anaheim · Melanie: Garden Grove · Diamond: depot.
        Nearby too-far visits are grouped into recommended routes so staff can consolidate them onto
        one day.
        {meta && (
          <span className="block mt-1">
            Scanned {meta.checked} upcoming future
            {meta.unlocated > 0
              ? ` · ${meta.unlocated} could not be located by zip (check address)`
              : ""}
            {meta.routeCount > 0
              ? ` · ${meta.routeCount} recommended route${meta.routeCount === 1 ? "" : "s"}`
              : ""}
            {meta.isolatedCount > 0 ? ` · ${meta.isolatedCount} isolated` : ""}.
          </span>
        )}
      </p>
      {actionError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {actionError}
        </p>
      )}
      {totalCount === 0 ? (
        <p className="text-gray-500 text-sm py-8 text-center">
          No upcoming appointments are too far from a groomer home base.
        </p>
      ) : (
        <div className="space-y-4">
          {routes.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Recommended routes
              </h2>
              {routes.map((route) => (
                <RecommendedRouteCard
                  key={route.id}
                  route={route}
                  currentGroomerId={currentGroomerId}
                  colorByGroomer={colorByGroomer}
                  busyId={busyId}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
          {isolated.length > 0 && (
            <div className="space-y-1.5">
              {routes.length > 0 && (
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Isolated visits
                </h2>
              )}
              {isolated.map((entry) => (
                <TooFarAppointmentCard
                  key={entry.id}
                  entry={entry}
                  currentGroomerId={currentGroomerId}
                  colorByGroomer={colorByGroomer}
                  busyId={busyId}
                  onCancel={handleCancel}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
