"use client";

import { useCallback, useEffect, useState } from "react";
import type { DailyRoutePlan } from "@/lib/scheduling/daily-route";
import { BOOKABLE_GROOMER_IDS, GROOMERS } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";
import type { StaffBookAppointmentPrefill } from "@/lib/scheduling/staff-book-prefill";
import { appointmentToStaffBookPrefill } from "@/lib/scheduling/staff-book-prefill";
import type { Appointment } from "@/lib/scheduling/types";

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

export default function GroomerDailyRoute({
  groomerId: fixedGroomerId,
  routeApiBase = "/api/groomer/route",
  allowGroomerPick = false,
  onRebook,
}: {
  groomerId?: GroomerId;
  routeApiBase?: string;
  allowGroomerPick?: boolean;
  onRebook?: (prefill: StaffBookAppointmentPrefill) => void;
}) {
  const [selectedGroomerId, setSelectedGroomerId] = useState<GroomerId | "">(
    fixedGroomerId ?? ""
  );
  const groomerId = (allowGroomerPick ? selectedGroomerId : fixedGroomerId) as
    | GroomerId
    | undefined;
  const bookableGroomerIds = BOOKABLE_GROOMER_IDS;
  const [scheduledDates, setScheduledDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [route, setRoute] = useState<DailyRoutePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoute = useCallback(
    async (date: string, forGroomerId: GroomerId) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ date });
        if (allowGroomerPick || routeApiBase.includes("/staff/")) {
          params.set("groomerId", forGroomerId);
        }
        const res = await fetch(`${routeApiBase}?${params.toString()}`, {
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
    },
    [allowGroomerPick, routeApiBase]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        if (allowGroomerPick) {
          const res = await fetch(routeApiBase, { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Could not load route");
          if (cancelled) return;

          const defaultId =
            (data.defaultGroomerId as GroomerId | undefined) ??
            bookableGroomerIds[0];
          setSelectedGroomerId(defaultId);
          const groomerRow = (data.groomers as { groomerId: GroomerId; scheduledDates: string[]; defaultDate: string | null }[] | undefined)?.find(
            (g) => g.groomerId === defaultId
          );
          const dates = groomerRow?.scheduledDates ?? [];
          setScheduledDates(dates);
          const initial = groomerRow?.defaultDate ?? dates[0] ?? "";
          setSelectedDate(initial);
          if (initial && defaultId) {
            await loadRoute(initial, defaultId);
          } else {
            setLoading(false);
          }
          return;
        }

        if (!groomerId) {
          setLoading(false);
          return;
        }

        const params = new URLSearchParams();
        if (routeApiBase.includes("/staff/")) {
          params.set("groomerId", groomerId);
        }
        const res = await fetch(
          params.size ? `${routeApiBase}?${params}` : routeApiBase,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load route");
        if (cancelled) return;

        const dates = data.scheduledDates ?? [];
        setScheduledDates(dates);
        const initial = data.defaultDate ?? dates[0] ?? "";
        setSelectedDate(initial);
        if (initial) {
          await loadRoute(initial, groomerId);
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
  }, [allowGroomerPick, groomerId, loadRoute, routeApiBase]);

  function handleDateChange(date: string) {
    setSelectedDate(date);
    if (date && groomerId) void loadRoute(date, groomerId);
  }

  function handleGroomerChange(id: GroomerId) {
    setSelectedGroomerId(id);
    setRoute(null);
    setScheduledDates([]);
    setSelectedDate("");
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${routeApiBase}?groomerId=${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load route");
        const dates = data.scheduledDates ?? [];
        setScheduledDates(dates);
        const initial = data.defaultDate ?? dates[0] ?? "";
        setSelectedDate(initial);
        if (initial) {
          await loadRoute(initial, id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load route");
        setLoading(false);
      }
    })();
  }

  async function rebookAppointment(appointmentId: string) {
    if (!onRebook) return;
    try {
      const res = await fetch("/api/groomer/appointments?filter=all", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load appointment");
      const appointment = (data.appointments as Appointment[] | undefined)?.find(
        (item) => item.id === appointmentId
      );
      if (!appointment) throw new Error("Appointment not found");
      onRebook(appointmentToStaffBookPrefill(appointment));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start rebook");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900">Daily route</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xl">
            {allowGroomerPick
              ? "Review each groomer's drive cycle to spot visits outside territory. Open Google Maps to verify stops."
              : "Full drive cycle: depot → each client in time order → back to depot. Gas at 11 MPG plus ¼ gal per appointment, priced at $5.25/gal."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          {allowGroomerPick && (
            <label className="text-xs font-medium text-gray-700">
              <span className="block mb-1">Groomer</span>
              <select
                value={selectedGroomerId}
                onChange={(e) => handleGroomerChange(e.target.value as GroomerId)}
                className="w-full sm:w-auto rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm min-w-[160px]"
              >
                {bookableGroomerIds.map((id) => (
                  <option key={id} value={id}>
                    {GROOMERS[id].name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {scheduledDates.length > 0 && (
            <label className="text-xs font-medium text-gray-700">
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

      {!loading && !error && scheduledDates.length === 0 && groomerId && (
        <p className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
          No upcoming scheduled appointments
          {allowGroomerPick ? ` for ${GROOMERS[groomerId].name}` : " on your calendar"}.
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
                {onRebook && (
                  <button
                    type="button"
                    onClick={() => void rebookAppointment(stop.appointmentId)}
                    className="mt-3 inline-flex items-center rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                  >
                    Rebook
                  </button>
                )}
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
