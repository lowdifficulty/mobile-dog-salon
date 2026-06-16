"use client";

import { useEffect, useState } from "react";
import {
  PET_SIZES,
  SERVICE_OPTIONS,
  ORANGE_COUNTY_CITIES,
} from "@/lib/constants";
import type { AvailableSlot } from "@/lib/scheduling/types";

interface BookingFormData {
  petName: string;
  petBreed: string;
  petSize: string;
  service: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  preferredDate: string;
  preferredTime: string;
  slotKey: string;
  groomerName: string;
  notes: string;
}

const initialData: BookingFormData = {
  petName: "",
  petBreed: "",
  petSize: "",
  service: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  preferredDate: "",
  preferredTime: "",
  slotKey: "",
  groomerName: "",
  notes: "",
};

const STEPS = [
  { id: 1, title: "Your Pet", subtitle: "Tell us about your furry friend" },
  { id: 2, title: "Service", subtitle: "Choose the perfect grooming package" },
  { id: 3, title: "Schedule", subtitle: "Pick an open slot with your groomer" },
  { id: 4, title: "Contact", subtitle: "How can we reach you?" },
];

interface BookingFormProps {
  onClose?: () => void;
}

export default function BookingForm({ onClose }: BookingFormProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingFormData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  const update = (field: keyof BookingFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const currentMonth = data.preferredDate
    ? data.preferredDate.slice(0, 7)
    : new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (!data.service) return;
    fetch(`/api/availability?month=${currentMonth}&service=${encodeURIComponent(data.service)}`)
      .then((r) => r.json())
      .then((d) => setAvailableDates(d.dates ?? []))
      .catch(() => setAvailableDates([]));
  }, [data.service, currentMonth]);

  useEffect(() => {
    if (!data.preferredDate || !data.service) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    fetch(
      `/api/availability?date=${data.preferredDate}&service=${encodeURIComponent(data.service)}`
    )
      .then((r) => r.json())
      .then((d) => setSlots(d.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [data.preferredDate, data.service]);

  const selectSlot = (slot: AvailableSlot) => {
    setData((prev) => ({
      ...prev,
      slotKey: slot.slotKey,
      preferredDate: slot.date,
      preferredTime: slot.displayTime,
      groomerName: slot.groomerName,
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.petName && data.petBreed && data.petSize;
      case 2:
        return data.service;
      case 3:
        return data.address && data.city && data.slotKey;
      case 4:
        return data.firstName && data.lastName && data.email && data.phone;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        setSubmitError(result.error ?? "Could not book that slot. Please pick another time.");
        setIsSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }

    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-bold text-2xl text-gray-900 mb-3">You&apos;re booked!</h3>
        <p className="text-gray-600 mb-4 max-w-md mx-auto">
          Thanks, {data.firstName}! <strong>{data.petName}</strong> is scheduled with{" "}
          <strong>{data.groomerName}</strong> on {data.preferredDate} at {data.preferredTime}.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          We&apos;ve added this to our groomer calendar. You&apos;ll receive a confirmation email shortly.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step >= s.id ? "bg-brand text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > s.id ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.id
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    step > s.id ? "bg-brand-bright" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <h2 className="font-bold text-xl text-gray-900">{STEPS[step - 1].title}</h2>
        <p className="text-sm text-gray-500">{STEPS[step - 1].subtitle}</p>
      </div>

      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Pet&apos;s Name *</label>
              <input
                type="text"
                value={data.petName}
                onChange={(e) => update("petName", e.target.value)}
                placeholder="e.g. Bella"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Breed *</label>
              <input
                type="text"
                value={data.petBreed}
                onChange={(e) => update("petBreed", e.target.value)}
                placeholder="e.g. Golden Retriever"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Size *</label>
              <div className="grid grid-cols-2 gap-3">
                {PET_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => update("petSize", size.value)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      data.petSize === size.value
                        ? "border-brand-bright bg-brand-bright/10 text-brand-bright"
                        : "border-gray-200 text-gray-700 hover:border-brand-bright/50"
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {SERVICE_OPTIONS.map((service) => (
              <button
                key={service.value}
                type="button"
                onClick={() => {
                  update("service", service.value);
                  update("slotKey", "");
                  update("preferredTime", "");
                  update("groomerName", "");
                }}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${
                  data.service === service.value
                    ? "border-brand-bright bg-brand-bright/10"
                    : "border-gray-200 hover:border-brand-bright/50"
                }`}
              >
                <span className="font-medium text-gray-900">{service.label}</span>
                <span className="text-sm text-brand-bright font-semibold">{service.price}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address *</label>
              <input
                type="text"
                value={data.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="123 Main St"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
              <select
                value={data.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
              >
                <option value="">Select your city</option>
                {ORANGE_COUNTY_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
              <input
                type="date"
                value={data.preferredDate}
                onChange={(e) => {
                  update("preferredDate", e.target.value);
                  update("slotKey", "");
                  update("preferredTime", "");
                  update("groomerName", "");
                }}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
              />
              {data.service && availableDates.length === 0 && (
                <p className="text-xs text-amber-700 mt-2">
                  No groomer availability this month yet — ask Melanie or Diamond to update their schedule.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available times *
              </label>
              {!data.preferredDate ? (
                <p className="text-sm text-gray-500">Choose a date to see open slots.</p>
              ) : slotsLoading ? (
                <p className="text-sm text-gray-500">Loading open slots…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-gray-500">No open slots on this day. Try another date.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.slotKey}
                      type="button"
                      onClick={() => selectSlot(slot)}
                      className={`px-3 py-3 rounded-xl border text-sm font-semibold text-left transition-all ${
                        data.slotKey === slot.slotKey
                          ? "border-brand bg-brand text-white"
                          : "border-gray-200 hover:border-accent text-gray-800"
                      }`}
                    >
                      <span className="block">{slot.displayTime}</span>
                      <span className={`block text-xs mt-0.5 ${data.slotKey === slot.slotKey ? "text-white/90" : "text-gray-500"}`}>
                        with {slot.groomerName}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Special Notes</label>
              <textarea
                value={data.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Any special needs, behavioral notes, or requests..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none resize-none"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name *</label>
                <input
                  type="text"
                  value={data.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name *</label>
                <input
                  type="text"
                  value={data.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone *</label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(714) 555-0123"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
              />
            </div>

            <div className="bg-brand-light rounded-xl p-4 mt-4 border border-accent/20">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Booking Summary</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="text-gray-400">Pet:</span> {data.petName} ({data.petBreed})</p>
                <p><span className="text-gray-400">Service:</span> {SERVICE_OPTIONS.find((s) => s.value === data.service)?.label}</p>
                <p><span className="text-gray-400">When:</span> {data.preferredDate} at {data.preferredTime}</p>
                <p><span className="text-gray-400">Groomer:</span> {data.groomerName}</p>
                <p><span className="text-gray-400">Where:</span> {data.address}, {data.city}</p>
              </div>
            </div>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => canProceed() && setStep(step + 1)}
            disabled={!canProceed()}
            className="px-6 py-2.5 bg-brand text-white text-sm font-semibold rounded-full hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting}
            className="px-6 py-2.5 bg-brand text-white text-sm font-semibold rounded-full hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? "Booking…" : "Book an Appointment"}
          </button>
        )}
      </div>
    </div>
  );
}
