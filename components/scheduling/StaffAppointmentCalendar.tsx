"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAppointmentTitle, getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { formatPetNames, getAppointmentPets } from "@/lib/booking/pets";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { computeDayCalendarStats } from "@/lib/scheduling/day-calendar-stats";
import {
  GROOMERS,
  formatBookingBlockDisplay,
  groomerSeesTeamAppointments,
} from "@/lib/scheduling/groomers";
import {
  groomerAppointmentCardClass,
  groomerAppointmentLeftBorderClass,
  groomerAppointmentLegendDotClass,
  groomerAppointmentLegendLabel,
} from "@/lib/scheduling/groomer-crm-colors";
import AppointmentAddressActions from "@/components/scheduling/AppointmentAddressActions";
import AppointmentPhoneActions from "@/components/scheduling/AppointmentPhoneActions";
import { parseSlotFromIso, getTodayPacificDate } from "@/lib/scheduling/slots";
import { setStaffAppointmentsCache } from "@/lib/scheduling/use-staff-appointments-cache";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";
import type { StaffBookAppointmentPrefill } from "@/lib/scheduling/staff-book-prefill";
import { appointmentToStaffBookPrefill } from "@/lib/scheduling/staff-book-prefill";
import type { VanSlotOccupancy } from "@/lib/scheduling/van-capacity";
import { activeVansOnDate, vanLabel, type VanId } from "@/lib/scheduling/vans";
import AppointmentPaymentModal from "@/components/payments/AppointmentPaymentModal";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AdminOpenSlot {
  date: string;
  time: string;
  displayTime: string;
  van: VanId;
  groomerId?: GroomerId;
  groomerName?: string;
}

function adminOpenSlotsByVan(slots: AdminOpenSlot[]): Map<VanId, AdminOpenSlot[]> {
  const map = new Map<VanId, AdminOpenSlot[]>();
  for (const slot of slots) {
    const bucket = map.get(slot.van) ?? [];
    bucket.push(slot);
    map.set(slot.van, bucket);
  }
  for (const [vanId, list] of map) {
    list.sort((a, b) => a.time.localeCompare(b.time));
    map.set(vanId, list);
  }
  return map;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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

function monthDateBounds(year: number, month: number): { from: string; to: string } {
  const monthStr = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${monthStr}-01`,
    to: `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`,
  };
}

function getMonthGrid(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];

  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function appointmentsByDate(
  appointments: Appointment[],
  status: "confirmed" | "cancelled" = "confirmed"
): Map<string, Appointment[]> {
  const map = new Map<string, Appointment[]>();
  for (const ap of appointments) {
    if (ap.status !== status) continue;
    const { date } = parseSlotFromIso(ap.startAt);
    const bucket = map.get(date) ?? [];
    bucket.push(ap);
    map.set(date, bucket);
  }
  for (const [date, list] of map) {
    list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    map.set(date, list);
  }
  return map;
}

function groomerOpenSlotsByDate(openSlotKeys: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const key of openSlotKeys) {
    const [date, time] = key.split("|");
    if (!date || !time) continue;
    const bucket = map.get(date) ?? [];
    bucket.push(time);
    map.set(date, bucket);
  }
  for (const [date, times] of map) {
    map.set(date, [...times].sort());
  }
  return map;
}

function adminOpenSlotsByDate(openSlots: AdminOpenSlot[]): Map<string, AdminOpenSlot[]> {
  const map = new Map<string, AdminOpenSlot[]>();
  for (const slot of openSlots) {
    const bucket = map.get(slot.date) ?? [];
    bucket.push(slot);
    map.set(slot.date, bucket);
  }
  for (const [date, list] of map) {
    list.sort((a, b) => a.time.localeCompare(b.time));
    map.set(date, list);
  }
  return map;
}

export default function StaffAppointmentCalendar({
  mode,
  groomerId,
  refreshKey = 0,
  onRebook,
}: {
  mode: "groomer" | "admin";
  groomerId?: GroomerId;
  refreshKey?: number;
  onRebook?: (prefill: StaffBookAppointmentPrefill) => void;
}) {
  const today = getTodayPacificDate();
  const seesTeam = groomerId ? groomerSeesTeamAppointments(groomerId) : true;
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [openSlotKeys, setOpenSlotKeys] = useState<string[]>([]);
  const [adminOpenSlots, setAdminOpenSlots] = useState<AdminOpenSlot[]>([]);
  const [slotOccupancy, setSlotOccupancy] = useState<VanSlotOccupancy[]>([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [payAppointment, setPayAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const monthCells = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );
  const monthBounds = useMemo(
    () => monthDateBounds(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const byDate = useMemo(
    () => appointmentsByDate(appointments, "confirmed"),
    [appointments]
  );
  const cancelledByDate = useMemo(
    () => appointmentsByDate(appointments, "cancelled"),
    [appointments]
  );
  const groomerOpenByDate = useMemo(
    () => groomerOpenSlotsByDate(openSlotKeys),
    [openSlotKeys]
  );
  const adminOpenByDate = useMemo(
    () => adminOpenSlotsByDate(adminOpenSlots),
    [adminOpenSlots]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "admin") {
        const res = await fetch(
          `/api/admin/calendar?from=${monthBounds.from}&to=${monthBounds.to}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load calendar.");
        setAppointments(data.appointments ?? []);
        setAdminOpenSlots(data.openSlots ?? []);
        setSlotOccupancy(data.slots ?? []);
        setOpenSlotKeys([]);
      } else if (groomerId) {
        const [apRes, availRes] = await Promise.all([
          fetch("/api/groomer/appointments?filter=all"),
          fetch("/api/groomer/availability"),
        ]);
        const apData = await apRes.json();
        const availData = await availRes.json();
        if (!apRes.ok) throw new Error(apData.error ?? "Could not load appointments.");
        if (!availRes.ok) throw new Error(availData.error ?? "Could not load availability.");
        const loadedAppointments = apData.appointments ?? [];
        setAppointments(loadedAppointments);
        if (groomerId) {
          setStaffAppointmentsCache(groomerId, loadedAppointments);
        }
        setOpenSlotKeys(availData.openSlotKeys ?? []);
        setAdminOpenSlots([]);
        setSlotOccupancy([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load calendar.");
    } finally {
      setLoading(false);
    }
  }, [groomerId, mode, monthBounds.from, monthBounds.to]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    setSelectedAppointmentId(null);
  }, [selectedDate]);

  function goMonth(delta: number) {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  }

  const selectedAppointments = selectedDate ? byDate.get(selectedDate) ?? [] : [];
  const selectedCancelled =
    selectedDate && mode === "groomer" ? cancelledByDate.get(selectedDate) ?? [] : [];
  const selectedGroomerOpenSlots = selectedDate
    ? groomerOpenByDate.get(selectedDate) ?? []
    : [];
  const selectedAdminOpenSlots = selectedDate ? adminOpenByDate.get(selectedDate) ?? [] : [];
  const selectedAdminOpenByVan = useMemo(
    () => adminOpenSlotsByVan(selectedAdminOpenSlots),
    [selectedAdminOpenSlots]
  );
  const activeVansForSelectedDate = selectedDate ? activeVansOnDate(selectedDate) : [];
  const dayStats =
    mode === "admin" && selectedDate
      ? computeDayCalendarStats(selectedDate, appointments, slotOccupancy)
      : null;

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading calendar…</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <>
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-8 items-start">
      <div className="site-card p-6">
        {mode === "groomer" && seesTeam && groomerId && (
          <p className="text-xs text-gray-500 mb-3 flex flex-wrap gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(groomerId)}`}
                aria-hidden
              />
              My appointments
            </span>
            {(Object.keys(GROOMERS) as GroomerId[])
              .filter((id) => id !== groomerId)
              .map((id) => (
                <span key={id} className="inline-flex items-center gap-1.5">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(id)}`}
                    aria-hidden
                  />
                  {groomerAppointmentLegendLabel(id)}
                </span>
              ))}
          </p>
        )}

        {mode === "admin" && (
          <p className="text-xs text-gray-500 mb-3 flex flex-wrap gap-x-3 gap-y-1">
            {(Object.keys(GROOMERS) as GroomerId[]).map((id) => (
              <span key={id} className="inline-flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${groomerAppointmentLegendDotClass(id)}`}
                  aria-hidden
                />
                {GROOMERS[id].name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-gray-400">
              <span className="w-2 h-2 rounded-full shrink-0 bg-gray-300" aria-hidden />
              Open slot
            </span>
          </p>
        )}

        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="px-3 py-2 rounded-full border border-gray-200 text-sm font-semibold text-brand hover:border-accent"
            aria-label="Previous month"
          >
            ←
          </button>
          <h2 className="text-lg font-bold text-brand">{monthLabel(viewYear, viewMonth)}</h2>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="px-3 py-2 rounded-full border border-gray-200 text-sm font-semibold text-brand hover:border-accent"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-xs font-bold text-gray-500 py-2 uppercase tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthCells.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayAppointments = byDate.get(date) ?? [];
            const dayOpenCount =
              mode === "admin"
                ? (adminOpenByDate.get(date) ?? []).length
                : (groomerOpenByDate.get(date) ?? []).length;
            const hasBooked = dayAppointments.length > 0;
            const hasOpen = dayOpenCount > 0;
            const isSelected = date === selectedDate;
            const isToday = date === today;
            const isPast = date < today;

            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-sm font-semibold border transition-all p-1 ${
                  isSelected
                    ? "bg-brand text-white border-brand shadow-md"
                    : hasBooked
                      ? "bg-white text-gray-800 border-green-300 hover:border-green-400"
                      : hasOpen
                        ? "bg-white text-gray-800 border-gray-200 hover:border-gray-300"
                        : isPast
                          ? "bg-gray-50 text-gray-400 border-gray-100"
                          : "bg-gray-50 text-gray-500 border-gray-100 hover:border-gray-200"
                } ${isToday && !isSelected ? "ring-2 ring-accent ring-offset-1" : ""}`}
              >
                <span>{Number(date.slice(8, 10))}</span>
                <div className="flex gap-1">
                  {hasBooked && (
                    <span
                      className={`w-2 h-2 rounded-full ${isSelected ? "bg-white" : "bg-green-500"}`}
                      title={`${dayAppointments.length} booked`}
                    />
                  )}
                  {hasOpen && (
                    <span
                      className={`w-2 h-2 rounded-full ${isSelected ? "bg-white/70" : "bg-gray-300"}`}
                      title={`${dayOpenCount} open`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="site-card p-4 lg:sticky lg:top-8 space-y-4">
        {selectedDate ? (
          <>
            <h3 className="text-lg font-bold text-brand">{formatDateLabel(selectedDate)}</h3>

            {dayStats && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    # of Appointments
                  </p>
                  <p className="text-2xl font-bold text-brand">{dayStats.appointmentCount}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Van Utilization
                  </p>
                  <p className="text-2xl font-bold text-brand">
                    {dayStats.vanUtilizationPercent}%
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                    Est. Revenue
                  </p>
                  <p className="text-2xl font-bold text-brand">
                    {dayStats.estimatedRevenueDisplay}
                  </p>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-2">Booked</h4>
              {selectedAppointments.length === 0 ? (
                <p className="text-sm text-gray-500">No appointments this day.</p>
              ) : (
                <div className="space-y-1">
                  {selectedAppointments.map((ap) => {
                    const isOwn = groomerId ? ap.groomerId === groomerId : false;
                    const isExpanded = selectedAppointmentId === ap.id;
                    const showTeamColors = mode === "admin" || seesTeam;
                    return (
                      <div key={ap.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedAppointmentId(isExpanded ? null : ap.id)
                          }
                          className={`w-full text-left rounded-lg border px-2.5 py-1.5 transition-colors border-l-4 shadow-sm ${groomerAppointmentLeftBorderClass(
                            ap.groomerId
                          )} ${groomerAppointmentCardClass(
                            ap.groomerId,
                            {
                              isOwn: mode === "admin" ? false : isOwn,
                              cancelled: false,
                              colorByGroomer: showTeamColors,
                            }
                          )}`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-xs font-semibold text-gray-900">
                              {formatWhen(ap.startAt)}
                            </p>
                            {(mode === "admin" || (seesTeam && !isOwn)) && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${groomerAppointmentLegendDotClass(ap.groomerId)}`}
                                  aria-hidden
                                />
                                {GROOMERS[ap.groomerId].name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-700 leading-snug truncate">
                            {formatAppointmentTitle(ap)}
                          </p>
                        </button>
                        {isExpanded && (
                          <div className="mt-1 rounded-lg border border-gray-100 bg-white/80 px-2.5 py-2 text-xs text-gray-600 space-y-0.5">
                            <p>
                              <strong>Pet:</strong> {formatPetNames(getAppointmentPets(ap))}
                            </p>
                            <p>
                              <strong>Client:</strong> {ap.firstName} {ap.lastName}
                            </p>
                            <div>
                              <AppointmentPhoneActions phone={ap.phone} />
                            </div>
                            <div>
                              <AppointmentAddressActions address={formatAppointmentAddress(ap)} />
                            </div>
                            {ap.notes ? (
                              <p>
                                <strong>Notes:</strong> {ap.notes}
                              </p>
                            ) : null}
                            {ap.status !== "cancelled" &&
                              getAppointmentBookedPrice(ap) != null &&
                              (mode === "admin" || isOwn) && (
                                <button
                                  type="button"
                                  onClick={() => setPayAppointment(ap)}
                                  className="mt-2 inline-flex items-center rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                                >
                                  Collect payment
                                </button>
                              )}
                            {mode === "groomer" && onRebook && isOwn && (
                              <button
                                type="button"
                                onClick={() => onRebook(appointmentToStaffBookPrefill(ap))}
                                className="mt-2 inline-flex items-center rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
                              >
                                Rebook
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedCancelled.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-800 mb-2">Cancelled</h4>
                <p className="text-xs text-gray-500 mb-2">
                  These no longer count on your route or schedule — shown so nothing looks
                  missing.
                </p>
                <div className="space-y-2">
                  {selectedCancelled.map((ap) => (
                    <div
                      key={ap.id}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 border-l-4 border-dashed opacity-75 ${groomerAppointmentCardClass(
                        ap.groomerId,
                        {
                          isOwn: groomerId ? ap.groomerId === groomerId : false,
                          cancelled: true,
                          colorByGroomer: false,
                        }
                      )}`}
                    >
                      <p className="text-sm font-semibold text-gray-600">
                        {formatWhen(ap.startAt)}
                      </p>
                      <p className="text-sm text-gray-700 mt-0.5">
                        {formatAppointmentTitle(ap)}
                      </p>
                      <p className="text-xs font-semibold text-gray-500 mt-1">Cancelled</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-2">Open slots</h4>
              {selectedDate < today ? (
                <p className="text-sm text-gray-500">Past days have no open booking slots.</p>
              ) : mode === "admin" ? (
                selectedAdminOpenSlots.length === 0 ? (
                  <p className="text-sm text-gray-500">No open slots this day.</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold text-brand">
                        {selectedAdminOpenSlots.length}{" "}
                        {selectedAdminOpenSlots.length === 1 ? "slot" : "slots"} available
                      </span>
                      <span className="text-gray-500">
                        {" "}
                        —{" "}
                        {activeVansForSelectedDate
                          .filter((vanId) => (selectedAdminOpenByVan.get(vanId) ?? []).length > 0)
                          .map(
                            (vanId) =>
                              `${vanLabel(vanId)} ${(selectedAdminOpenByVan.get(vanId) ?? []).length}`
                          )
                          .join(" · ")}
                      </span>
                    </p>
                    <div className="space-y-2">
                      {activeVansForSelectedDate.map((vanId) => {
                        const vanSlots = selectedAdminOpenByVan.get(vanId) ?? [];
                        if (vanSlots.length === 0) return null;
                        return (
                          <details
                            key={vanId}
                            className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2 group"
                          >
                            <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-sm font-semibold text-brand [&::-webkit-details-marker]:hidden">
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className="text-gray-400 transition-transform group-open:rotate-90"
                                  aria-hidden
                                >
                                  ▸
                                </span>
                                {vanLabel(vanId)}
                              </span>
                              <span className="text-xs font-semibold text-gray-500">
                                {vanSlots.length} {vanSlots.length === 1 ? "slot" : "slots"}
                              </span>
                            </summary>
                            <div className="mt-2 flex flex-wrap gap-2 pl-5">
                              {vanSlots.map((slot) => (
                                <span
                                  key={`${slot.van}-${slot.time}`}
                                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-gray-50 text-gray-700 border-gray-200"
                                >
                                  {slot.groomerName ? `${slot.groomerName} · ` : ""}
                                  {slot.displayTime}
                                </span>
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : selectedGroomerOpenSlots.length === 0 ? (
                <p className="text-sm text-gray-500">No open slots this day.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedGroomerOpenSlots.map((time) => (
                    <span
                      key={time}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-gray-50 text-gray-700 border-gray-200"
                    >
                      {formatBookingBlockDisplay(time, groomerId!)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Select a day on the calendar.</p>
        )}

        <button
          type="button"
          onClick={() => load()}
          className="text-sm font-semibold text-brand hover:underline"
        >
          Refresh
        </button>
      </div>
    </div>
    {payAppointment && (
      <AppointmentPaymentModal
        appointment={payAppointment}
        onClose={() => setPayAppointment(null)}
        onPaid={() => setPayAppointment(null)}
      />
    )}
  </>
  );
}
