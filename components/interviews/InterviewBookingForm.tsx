"use client";

import { useCallback, useEffect, useState } from "react";
import {
  formatInterviewDateLong,
  formatInterviewDatePickerLabel,
  interviewAvailabilityHoursLabel,
} from "@/lib/interviews/slots";

interface InterviewSlot {
  slotKey: string;
  date: string;
  timeLabel: string;
  available: boolean;
}

interface InterviewDateOption {
  date: string;
  dateLabel: string;
  weekdayLabel: string;
  availableCount: number;
  totalCount: number;
}

interface InterviewIntro {
  roleTitle: string;
}

type Step = "schedule" | "contact";

export default function InterviewBookingForm({ intro }: { intro?: InterviewIntro }) {
  const [step, setStep] = useState<Step>("schedule");
  const [dates, setDates] = useState<InterviewDateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [roleTitle, setRoleTitle] = useState(intro?.roleTitle ?? "");
  const [loading, setLoading] = useState(true);
  const [slotKey, setSlotKey] = useState("");
  const [selectedTimeLabel, setSelectedTimeLabel] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<{
    fullName: string;
    date: string;
    time: string;
    roleTitle: string;
  } | null>(null);

  const loadSlotsForDate = useCallback(async (date: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/interviews/slots?date=${encodeURIComponent(date)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load times");
      setSelectedDate(date);
      setDateLabel(data.dateLabel ?? formatInterviewDateLong(date));
      setSlots(data.slots ?? []);
      if (!intro?.roleTitle) setRoleTitle(data.roleTitle ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load interview times.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [intro?.roleTitle]);

  const refreshDates = useCallback(async () => {
    const res = await fetch("/api/interviews/slots", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load dates");
    setDates(data.dates ?? []);
    return data as {
      activeDate: string | null;
      dateLabel: string;
      dates: InterviewDateOption[];
      roleTitle: string;
      slots: InterviewSlot[];
    };
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refreshDates();
      if (!intro?.roleTitle) setRoleTitle(data.roleTitle ?? "");
      const initialDate = data.activeDate ?? data.dates?.[0]?.date ?? "";
      if (!initialDate) {
        setSelectedDate("");
        setDateLabel("");
        setSlots([]);
        return;
      }
      setSelectedDate(initialDate);
      setDateLabel(data.dateLabel || formatInterviewDateLong(initialDate));
      setSlots(data.slots ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load interview times.");
      setDates([]);
      setSelectedDate("");
      setDateLabel("");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [intro?.roleTitle, refreshDates]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const dateIndex = dates.findIndex((d) => d.date === selectedDate);
  const canGoPrev = dateIndex > 0;
  const canGoNext = dateIndex >= 0 && dateIndex < dates.length - 1;

  function goToRelativeDate(offset: -1 | 1) {
    if (dateIndex < 0) return;
    const nextIndex = dateIndex + offset;
    if (nextIndex < 0 || nextIndex >= dates.length) return;
    setSlotKey("");
    setSelectedTimeLabel("");
    void loadSlotsForDate(dates[nextIndex].date);
  }

  function handleSelectSlot(slot: InterviewSlot) {
    setSlotKey(slot.slotKey);
    setSelectedTimeLabel(slot.timeLabel);
  }

  function handleContinueToContact() {
    if (!slotKey) {
      setError("Please choose an interview time.");
      return;
    }
    setError("");
    setStep("contact");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slotKey) {
      setError("Please choose an interview time.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/interviews/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotKey, fullName, email, phone, yearsExperience: Number(yearsExperience) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && selectedDate) {
          setSlotKey("");
          setSelectedTimeLabel("");
          setStep("schedule");
          await refreshDates();
          await loadSlotsForDate(selectedDate);
        }
        throw new Error(data.error ?? "Could not book interview");
      }

      setBooked({
        fullName: data.booking.fullName,
        date: data.booking.date,
        time: data.booking.time,
        roleTitle: data.booking.roleTitle,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not book interview");
    } finally {
      setSubmitting(false);
    }
  }

  if (booked) {
    const firstName = booked.fullName.split(" ")[0] || booked.fullName;
    const bookedDateLabel = formatInterviewDateLong(booked.date);
    return (
      <div className="interview-booking-card">
        <div className="text-center mb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 border border-green-200">
            <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="interview-booking-title">Request received!</h2>
          <p className="interview-booking-meta mt-2">
            Thanks, {firstName}! {booked.roleTitle} · {bookedDateLabel} · {booked.time} Pacific
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            We&apos;ll confirm your interview time by email or phone.
          </p>
        </div>
      </div>
    );
  }

  const availableCount = slots.filter((s) => s.available).length;
  const selectedDateMeta = dates.find((d) => d.date === selectedDate);
  const otherDateHasOpenings = dates.some(
    (d) => d.date !== selectedDate && d.availableCount > 0
  );

  if (step === "contact") {
    return (
      <form onSubmit={handleSubmit} className="interview-booking-card space-y-3 sm:space-y-3.5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">Step 2 of 2</p>
          <h1 className="interview-booking-title">Your contact details</h1>
          <p className="interview-booking-meta">
            <strong>{roleTitle || "Mobile Dog Groomer"}</strong> · {formatInterviewDateLong(selectedDate)} ·{" "}
            {selectedTimeLabel} Pacific
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="interview-name" className="interview-booking-label">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id="interview-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="interview-booking-input"
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="interview-phone" className="interview-booking-label">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              id="interview-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="interview-booking-input"
              autoComplete="tel"
            />
          </div>
          <div>
            <label htmlFor="interview-email" className="interview-booking-label">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="interview-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="interview-booking-input"
              autoComplete="email"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="interview-experience" className="interview-booking-label">
              Years of grooming experience <span className="text-red-500">*</span>
            </label>
            <input
              id="interview-experience"
              type="number"
              required
              min={0}
              max={60}
              step={1}
              inputMode="numeric"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              className="interview-booking-input"
              placeholder="e.g. 3"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => {
              setError("");
              setStep("schedule");
            }}
            className="booking-form-ghost-btn flex-1 flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="booking-form-ghost-btn flex-1 flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Booking…" : "Schedule interview"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="interview-booking-card space-y-3 sm:space-y-3.5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">Step 1 of 2</p>
        <h1 className="interview-booking-title">Schedule Your Interview</h1>
        <p className="interview-booking-meta">
          <strong>{roleTitle || "Mobile Dog Groomer"}</strong> · 30 min · Mon–Thu ·{" "}
          {interviewAvailabilityHoursLabel()} Pacific
        </p>
      </div>

      <div>
        <label className="interview-booking-label">
          Interview date <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="interview-date-nav-btn"
            disabled={loading || !canGoPrev}
            onClick={() => goToRelativeDate(-1)}
            aria-label="Previous interview date"
          >
            ‹
          </button>
          <div className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center">
            <p className="text-sm font-semibold text-brand truncate">
              {loading && !dateLabel ? "Loading…" : dateLabel || "No dates"}
            </p>
            {selectedDateMeta && !loading && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                {formatInterviewDatePickerLabel(selectedDate)} · {interviewAvailabilityHoursLabel()}
                {selectedDateMeta.availableCount === 0 ? " · Fully booked" : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            className="interview-date-nav-btn"
            disabled={loading || !canGoNext}
            onClick={() => goToRelativeDate(1)}
            aria-label="Next interview date"
          >
            ›
          </button>
        </div>
      </div>

      <div>
        <label className="interview-booking-label">
          Choose a time <span className="text-red-500">*</span>
        </label>
        {loading ? (
          <p className="text-xs text-gray-500">Loading times…</p>
        ) : !selectedDate || availableCount === 0 ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            {otherDateHasOpenings
              ? "All times on this date are booked. Use the arrows to check the other day."
              : "All interview times are booked. Email "}
            {!otherDateHasOpenings && (
              <a href="mailto:careers@mobiledog-salon.com" className="font-semibold underline">
                careers@mobiledog-salon.com
              </a>
            )}
            {!otherDateHasOpenings && "."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {slots.map((slot) => (
              <button
                key={slot.slotKey}
                type="button"
                disabled={!slot.available}
                onClick={() => handleSelectSlot(slot)}
                className={`interview-slot-btn ${
                  !slot.available
                    ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed line-through"
                    : slotKey === slot.slotKey
                      ? "border-brand bg-brand text-white"
                      : "border-gray-200 bg-white text-gray-800 hover:border-brand"
                }`}
              >
                {slot.timeLabel}
              </button>
            ))}
          </div>
        )}
        {!loading && selectedDate && availableCount > 0 && (
          <p className="text-[11px] text-gray-500 mt-1">
            {availableCount} open · Pacific Time · Book at least 24 hours ahead
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleContinueToContact}
        disabled={loading || !selectedDate || availableCount === 0 || !slotKey}
        className="booking-form-ghost-btn w-full flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
