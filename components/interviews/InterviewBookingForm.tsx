"use client";

import { useCallback, useEffect, useState } from "react";
import {
  bookingToCalendarDetails,
  type InterviewCalendarDetails,
} from "@/lib/interviews/calendar-links";
import InterviewAddToCalendarButtons from "./InterviewAddToCalendarButtons";

interface InterviewSlot {
  slotKey: string;
  date: string;
  timeLabel: string;
  available: boolean;
}

interface InterviewIntro {
  dateLabel: string;
  roleTitle: string;
  payDescription: string;
}

export default function InterviewBookingForm({ intro }: { intro?: InterviewIntro }) {
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [dateLabel, setDateLabel] = useState(intro?.dateLabel ?? "");
  const [roleTitle, setRoleTitle] = useState(intro?.roleTitle ?? "");
  const [payDescription, setPayDescription] = useState(intro?.payDescription ?? "");
  const [loadingSlots, setLoadingSlots] = useState(true);
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

  const loadSlots = useCallback(() => {
    setLoadingSlots(true);
    return fetch("/api/interviews/slots", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setSlots(data.slots ?? []);
        if (!intro?.dateLabel) setDateLabel(data.dateLabel ?? "");
        if (!intro?.roleTitle) setRoleTitle(data.roleTitle ?? "");
        if (!intro?.payDescription) setPayDescription(data.payDescription ?? "");
      })
      .catch(() => setError("Could not load interview times."))
      .finally(() => setLoadingSlots(false));
  }, [intro?.dateLabel, intro?.payDescription, intro?.roleTitle]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

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
        if (res.status === 409) {
          await loadSlots();
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
            Thanks, {firstName}! {calendarDetails.roleTitle} ·{" "}
            {dateLabel || calendarDetails.date} · {calendarDetails.time} Pacific ·{" "}
            {calendarDetails.payDescription}
          </p>
          <p className="text-[11px] text-gray-500 mt-1">{emailNote}</p>
        </div>
        <InterviewAddToCalendarButtons details={calendarDetails} />
      </div>
    );
  }

  const availableCount = slots.filter((s) => s.available).length;

  return (
    <form onSubmit={handleSubmit} className="interview-booking-card space-y-3 sm:space-y-3.5">
      <div>
        <h1 className="interview-booking-title">Schedule Your Interview</h1>
        <p className="interview-booking-meta">
          <strong>{roleTitle || "Mobile Dog Groomer"}</strong> ·{" "}
          {dateLabel || "Tuesday, July 14, 2026"} · {payDescription || "$20/hour plus tips"} ·
          20 min · Pacific
        </p>
      </div>

      <div>
        <label className="interview-booking-label">
          Choose a time <span className="text-red-500">*</span>
        </label>
        {loadingSlots ? (
          <p className="text-xs text-gray-500">Loading times…</p>
        ) : availableCount === 0 ? (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            All times booked. Email{" "}
            <a href="mailto:careers@mobiledog-salon.com" className="font-semibold underline">
              careers@mobiledog-salon.com
            </a>
            .
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
        {!loadingSlots && availableCount > 0 && (
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
        disabled={submitting || loadingSlots || availableCount === 0}
        className="booking-form-ghost-btn w-full flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Booking…" : "Schedule interview"}
      </button>
    </form>
  );
}
