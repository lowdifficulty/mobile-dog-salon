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

type Step = "schedule" | "contact" | "photos" | "complete";

async function filesToPhotoPayloads(files: File[]) {
  return Promise.all(
    files.map(async (file) => {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
      }
      return {
        fileName: file.name,
        mimeType: file.type || "image/jpeg",
        dataBase64: btoa(binary),
      };
    })
  );
}

function stepLabel(step: Step): string {
  if (step === "schedule") return "Step 1 of 3";
  if (step === "contact") return "Step 2 of 3";
  if (step === "photos") return "Step 3 of 3";
  return "Complete";
}

export default function GroomerApplicationModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("schedule");
  const [dates, setDates] = useState<InterviewDateOption[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotKey, setSlotKey] = useState("");
  const [selectedTimeLabel, setSelectedTimeLabel] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [bookedDate, setBookedDate] = useState("");
  const [bookedTime, setBookedTime] = useState("");
  const [roleTitle, setRoleTitle] = useState("Mobile Dog Groomer");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [uploadedPhotoCount, setUploadedPhotoCount] = useState(0);
  const [uploading, setUploading] = useState(false);

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
      setRoleTitle(data.roleTitle ?? "Mobile Dog Groomer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load interview times.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
      setRoleTitle(data.roleTitle ?? "Mobile Dog Groomer");
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
  }, [refreshDates]);

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

  async function handleBook(e: React.FormEvent) {
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
        body: JSON.stringify({
          slotKey,
          fullName,
          email,
          phone,
          yearsExperience: Number(yearsExperience),
        }),
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

      setApplicationId(data.booking.id);
      setBookedDate(data.booking.date);
      setBookedTime(data.booking.time);
      setStep("photos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not book interview");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadAndComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!applicationId) return;
    if (photoFiles.length === 0) {
      setError("Please choose at least one after photo of your grooms.");
      return;
    }

    setUploading(true);
    setError("");
    try {
      const photos = await filesToPhotoPayloads(photoFiles);
      const uploadRes = await fetch(`/api/careers/groomer-application/${applicationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploadData.error ?? "Could not upload photos");
      }

      const completeRes = await fetch(`/api/careers/groomer-application/${applicationId}`, {
        method: "PATCH",
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error ?? "Could not complete application");
      }

      setUploadedPhotoCount(uploadData.photoCount ?? photoFiles.length);
      setStep("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish application");
    } finally {
      setUploading(false);
    }
  }

  const availableCount = slots.filter((s) => s.available).length;
  const selectedDateMeta = dates.find((d) => d.date === selectedDate);
  const otherDateHasOpenings = dates.some(
    (d) => d.date !== selectedDate && d.availableCount > 0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="site-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="groomer-apply-title"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">
              {stepLabel(step)}
            </p>
            <h3 id="groomer-apply-title" className="font-bold text-xl text-brand">
              {step === "complete"
                ? "Application complete!"
                : step === "photos"
                  ? "Share your best grooms"
                  : step === "contact"
                    ? "Your contact details"
                    : "Choose interview time"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === "complete" ? (
          <div className="text-center py-2">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Thanks, {fullName.split(" ")[0] || fullName}! Your interview is booked and we received{" "}
              {uploadedPhotoCount} groom photo{uploadedPhotoCount === 1 ? "" : "s"}. We&apos;ll review
              everything and be in touch soon.
            </p>
            <button type="button" onClick={onClose} className="site-btn">
              Close
            </button>
          </div>
        ) : step === "photos" ? (
          <div className="space-y-4">
            <div className="text-center rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-semibold text-brand">Interview request received</p>
              <p className="text-xs text-gray-600 mt-1">
                {formatInterviewDateLong(bookedDate)} · {bookedTime} Pacific
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                We&apos;ll confirm your interview time by email or phone. Next, upload groom photos
                to complete your application.
              </p>
            </div>

            <form onSubmit={handleUploadAndComplete} className="space-y-4 pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-600 leading-relaxed">
                Almost done! Upload a few <strong>after</strong> photos of grooms you&apos;re proud of
                so we can see your work.
              </p>
              <div>
                <label htmlFor="groom-photos" className="block text-xs font-medium text-gray-700 mb-1">
                  Groom photos * (JPEG, PNG, or WebP — up to 5 MB each)
                </label>
                <input
                  id="groom-photos"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  multiple
                  onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-light file:text-brand hover:file:bg-brand/10"
                />
                {photoFiles.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {photoFiles.length} photo{photoFiles.length === 1 ? "" : "s"} selected
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={uploading || photoFiles.length === 0}
                className="site-btn w-full disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Submit photos & finish application"}
              </button>
            </form>
          </div>
        ) : step === "contact" ? (
          <form onSubmit={handleBook} className="space-y-4">
            <p className="text-sm text-gray-600">
              <strong>{roleTitle}</strong> · {formatInterviewDateLong(selectedDate)} · {selectedTimeLabel}{" "}
              Pacific
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="groomer-name" className="block text-xs font-medium text-gray-700 mb-1">
                  Full name *
                </label>
                <input
                  id="groomer-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="interview-booking-input"
                />
              </div>
              <div>
                <label htmlFor="groomer-phone" className="block text-xs font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  id="groomer-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="interview-booking-input"
                />
              </div>
              <div>
                <label htmlFor="groomer-email" className="block text-xs font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  id="groomer-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="interview-booking-input"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="groomer-experience" className="block text-xs font-medium text-gray-700 mb-1">
                  Years of grooming experience *
                </label>
                <input
                  id="groomer-experience"
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep("schedule");
                }}
                className="site-btn-outline flex-1"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="site-btn flex-1 disabled:opacity-50"
              >
                {submitting ? "Booking…" : "Book interview & continue"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              <strong>{roleTitle}</strong> · 30 min · Mon–Thu · {interviewAvailabilityHoursLabel()} Pacific
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Interview date *
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Choose a time *</label>
              {loading ? (
                <p className="text-xs text-gray-500">Loading times…</p>
              ) : !selectedDate || availableCount === 0 ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  {otherDateHasOpenings
                    ? "All times on this date are booked. Use the arrows to check another day."
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={handleContinueToContact}
              disabled={loading || !selectedDate || availableCount === 0 || !slotKey}
              className="site-btn w-full disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
