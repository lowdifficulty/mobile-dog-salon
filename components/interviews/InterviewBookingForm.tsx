"use client";

import { useCallback, useEffect, useState } from "react";
import {
  bookingToCalendarDetails,
  type InterviewCalendarDetails,
} from "@/lib/interviews/calendar-links";
import {
  formatInterviewDateLong,
  formatInterviewDatePickerLabel,
  INTERVIEW_DATES,
} from "@/lib/interviews/slots";
import InterviewAddToCalendarButtons from "./InterviewAddToCalendarButtons";

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
  payDescription: string;
}

export default function InterviewBookingForm({ intro }: { intro?: InterviewIntro }) {
  const [dates, setDates] = useState<InterviewDateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [roleTitle, setRoleTitle] = useState(intro?.roleTitle ?? "");
  const [payDescription, setPayDescription] = useState(intro?.payDescription ?? "");
  const [loading, setLoading] = useState(true);
  const [slotKey, setSlotKey] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [calendarDetails, setCalendarDetails] = useState<InterviewCalendarDetails | null>(
    null
  );
  const [emailNote, setEmailNote] = useState("");

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
      if (!intro?.payDescription) setPayDescription(data.payDescription ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load interview times.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [intro?.payDescription, intro?.roleTitle]);

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
      payDescription: string;
      slots: InterviewSlot[];
    };
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await refreshDates();
      if (!intro?.roleTitle) setRoleTitle(data.roleTitle ?? "");
      if (!intro?.payDescription) setPayDescription(data.payDescription ?? "");
      const initialDate = data.activeDate ?? INTERVIEW_DATES[0];
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
  }, [intro?.payDescription, intro?.roleTitle, refreshDates]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const dateIndex = INTERVIEW_DATES.indexOf(selectedDate as (typeof INTERVIEW_DATES)[number]);
  const canGoPrev = dateIndex > 0;
  const canGoNext = dateIndex >= 0 && dateIndex < INTERVIEW_DATES.length - 1;

  function goToRelativeDate(offset: -1 | 1) {
    if (dateIndex < 0) return;
    const nextIndex = dateIndex + offset;
    if (nextIndex < 0 || nextIndex >= INTERVIEW_DATES.length) return;
    setSlotKey("");
    void loadSlotsForDate(INTERVIEW_DATES[nextIndex]);
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
        body: JSON.stringify({ slotKey, fullName, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && selectedDate) {
          setSlotKey("");
          await refreshDates();
          await loadSlotsForDate(selectedDate);
        }
        throw new Error(data.error ?? "Could not book interview");
      }

      setCalendarDetails(bookingToCalendarDetails(data.booking));
      const sent = data.emailsSent;
      if (sent?.candidate) {
        setEmailNote("A confirmation email with a calendar invite has been sent to your inbox.");
      } else {
        setEmailNote(
          "Save your interview time using the calendar buttons below. (Email delivery is not configured on this server.)"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not book interview");
    } finally {
      setSubmitting(false);
    }
  }

  if (calendarDetails) {
    const firstName = calendarDetails.fullName.split(" ")[0] || calendarDetails.fullName;
    const bookedDateLabel = formatInterviewDateLong(calendarDetails.date);
    return (
      <div className="interview-booking-card">
        <div className="text-center mb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 border border-green-200">
            <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="interview-booking-title">You&apos;re scheduled!</h2>
          <p className="interview-booking-meta mt-2">
            Thanks, {firstName}! {calendarDetails.roleTitle} · {bookedDateLabel} ·{" "}
            {calendarDetails.time} Pacific · {calendarDetails.payDescription}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">{emailNote}</p>
        </div>
        <InterviewAddToCalendarButtons details={calendarDetails} />
      </div>
    );
  }

  const availableCount = slots.filter((s) => s.available).length;
  const selectedDateMeta = dates.find((d) => d.date === selectedDate);
  const otherDateHasOpenings = dates.some(
    (d) => d.date !== selectedDate && d.availableCount > 0
  );

  return (
    <form onSubmit={handleSubmit} className="interview-booking-card space-y-3 sm:space-y-3.5">
      <div>
        <h1 className="interview-booking-title">Schedule Your Interview</h1>
        <p className="interview-booking-meta">
          <strong>{roleTitle || "Mobile Dog Groomer"}</strong> ·{" "}
          {payDescription || "$20/hour plus tips"} · 20 min · Pacific
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
                {formatInterviewDatePickerLabel(selectedDate)} · 9 AM–12 PM
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
                onClick={() => setSlotKey(slot.slotKey)}
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
            {availableCount} open · Pacific Time
          </p>
        )}
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
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting || loading || !selectedDate || availableCount === 0}
        className="booking-form-ghost-btn w-full flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Booking…" : "Schedule interview"}
      </button>
    </form>
  );
}
