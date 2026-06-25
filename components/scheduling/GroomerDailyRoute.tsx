"use client";

import { useCallback, useEffect, useState } from "react";
import type { DailyRoutePlan } from "@/lib/scheduling/daily-route";
import type { GroomerId } from "@/lib/scheduling/types";
import GroomerRouteMap from "./GroomerRouteMap";

function formatMiles(miles: number): string {
  return miles < 10 ? miles.toFixed(1) : Math.round(miles).toString();
}

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function GroomerDailyRoute({ groomerId }: { groomerId: GroomerId }) {
  const [scheduledDates, setScheduledDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [route, setRoute] = useState<DailyRoutePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoute = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groomer/route?date=${encodeURIComponent(date)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load route");
      setScheduledDates(data.scheduledDates ?? []);
      setRoute(data.route ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load route");
      setRoute(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/groomer/route", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load route");
        if (cancelled) return;

        const dates = data.scheduledDates ?? [];
        setScheduledDates(dates);
        const initial = data.defaultDate ?? dates[0] ?? "";
        setSelectedDate(initial);
        if (initial) {
          await loadRoute(initial);
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load route");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [loadRoute]);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    if (date) void loadRoute(date);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Daily route</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            Full drive cycle: depot → each client in time order → back to depot. Gas at 11 MPG
            plus ¼ gal per appointment, priced at $5.25/gal.
          </p>
        </div>
        {scheduledDates.length > 0 && (
          <label className="text-xs font-medium text-gray-700 shrink-0">
            <span className="block mb-1">Day</span>
            <select
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm min-w-[220px]"
            >
              {scheduledDates.map((date) => (
                <option key={date} value={date}>
                  {formatDateLabel(date)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center">
          <p className="text-sm text-gray-600">Calculating your route…</p>
          <p className="text-xs text-gray-400 mt-1">Mileage and drive times for each stop</p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {!loading && !error && scheduledDates.length === 0 && (
        <p className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
          No upcoming scheduled appointments on your calendar.
        </p>
      )}

      {!loading && !error && selectedDate && !route && scheduledDates.length > 0 && (
        <p className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
          No confirmed appointments on {formatDateLabel(selectedDate)}.
        </p>
      )}

      {route && !loading && (
        <>
          {route.usesEstimates && (
            <p className="text-xs text-amber-800 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              Some legs use estimated mileage when live routing is unavailable.
            </p>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Total drive</p>
                <p className="text-lg font-bold text-brand leading-tight">
                  {formatMiles(route.totalDriveMiles)} mi
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Drive time</p>
                <p className="text-lg font-bold text-brand leading-tight">
                  {formatMinutes(route.totalDriveMinutes)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Gas cost</p>
                <p className="text-lg font-bold text-brand leading-tight">
                  {formatMoney(route.totalGasCost)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Stops</p>
                <p className="text-lg font-bold text-brand leading-tight">
                  {route.appointmentCount}
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-500 border-t border-gray-100 pt-3">
              {route.totalGallons.toFixed(1)} gal total ({route.gallonsDriving.toFixed(1)} driving
              + {route.gallonsAppointmentUse.toFixed(1)} on-site) at $
              {route.gasPricePerGallon.toFixed(2)}/gal · Round trip from {route.depotAddress}
            </p>
          </div>

          <GroomerRouteMap points={route.mapPoints} path={route.routePath} />

          <a
            href={route.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-full bg-brand text-white text-sm font-semibold px-5 py-3 hover:bg-brand-dark"
          >
            Open in Google Maps
          </a>

          <ol className="space-y-3 list-none m-0 p-0">
            {route.stops.map((stop) => (
              <li
                key={stop.appointmentId}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Stop {stop.order} · {stop.displayTime}
                    </p>
                    <p className="font-bold text-gray-900 mt-0.5">{stop.clientName}</p>
                  </div>
                  <p className="text-xs text-gray-500 shrink-0 text-right">
                    {formatMiles(stop.leg.distanceMiles)} mi
                    <br />
                    {formatMinutes(stop.leg.durationMinutes)}
                  </p>
                </div>
                <p className="text-sm text-gray-700 font-medium">
                  {stop.appointmentTitle}
                </p>
                {stop.petSummary && stop.petSummary !== "your pet" && (
                  <p className="text-sm text-gray-600 mt-0.5">{stop.petSummary}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">{stop.fullAddress}</p>
                {stop.leg.approximateLocation && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    Approximate location (ZIP centroid) — use Google Maps for exact address.
                  </p>
                )}
              </li>
            ))}
            <li className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Return · End of day
                  </p>
                  <p className="font-bold text-gray-900 mt-0.5">{route.returnLeg.toLabel}</p>
                  <p className="text-sm text-gray-600 mt-1">{route.depotAddress}</p>
                </div>
                <p className="text-xs text-gray-500 shrink-0 text-right">
                  {formatMiles(route.returnLeg.distanceMiles)} mi
                  <br />
                  {formatMinutes(route.returnLeg.durationMinutes)}
                </p>
              </div>
            </li>
          </ol>
        </>
      )}
    </div>
  );
}
