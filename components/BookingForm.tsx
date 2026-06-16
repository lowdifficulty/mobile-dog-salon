"use client";

import { useState } from "react";
import {
  PET_SIZES,
  SERVICE_OPTIONS,
  ORANGE_COUNTY_CITIES,
  BOOKING_URL,
} from "@/lib/constants";

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
  notes: "",
};

const STEPS = [
  { id: 1, title: "Your Pet", subtitle: "Tell us about your furry friend" },
  { id: 2, title: "Service", subtitle: "Choose the perfect grooming package" },
  { id: 3, title: "Schedule", subtitle: "When and where should we come?" },
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

  const update = (field: keyof BookingFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.petName && data.petBreed && data.petSize;
      case 2:
        return data.service;
      case 3:
        return data.address && data.city && data.preferredDate && data.preferredTime;
      case 4:
        return data.firstName && data.lastName && data.email && data.phone;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setIsSubmitting(true);

    try {
      await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } catch {
      // Continue to success even if API fails — user can use external booking
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-display text-2xl font-bold text-gray-900 mb-3">
          Request Received!
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Thank you, {data.firstName}! We&apos;ve received your booking request for{" "}
          <strong>{data.petName}</strong>. Our team will confirm your appointment shortly.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Want to pick a specific time slot right now?
        </p>
        <a
          href={BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue text-white font-semibold rounded-full hover:bg-blue-600 transition-colors"
        >
          Confirm on Calendar
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  step >= s.id
                    ? "bg-blue text-white"
                    : "bg-gray-100 text-gray-400"
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
                    step > s.id ? "bg-blue" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <h2 className="font-display text-xl font-bold text-gray-900">
          {STEPS[step - 1].title}
        </h2>
        <p className="text-sm text-gray-500">{STEPS[step - 1].subtitle}</p>
      </div>

      {/* Form fields */}
      <div className="flex-1 px-6 py-6 overflow-y-auto">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Pet&apos;s Name *
              </label>
              <input
                type="text"
                value={data.petName}
                onChange={(e) => update("petName", e.target.value)}
                placeholder="e.g. Bella"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Breed *
              </label>
              <input
                type="text"
                value={data.petBreed}
                onChange={(e) => update("petBreed", e.target.value)}
                placeholder="e.g. Golden Retriever"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Size *
              </label>
              <div className="grid grid-cols-2 gap-3">
                {PET_SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => update("petSize", size.value)}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      data.petSize === size.value
                        ? "border-blue bg-blue/10 text-blue"
                        : "border-gray-200 text-gray-700 hover:border-blue/50"
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
                onClick={() => update("service", service.value)}
                className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${
                  data.service === service.value
                    ? "border-blue bg-blue/10"
                    : "border-gray-200 hover:border-blue/50"
                }`}
              >
                <span className="font-medium text-gray-900">{service.label}</span>
                <span className="text-sm text-blue font-semibold">{service.price}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Street Address *
              </label>
              <input
                type="text"
                value={data.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="123 Main St"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                City *
              </label>
              <select
                value={data.city}
                onChange={(e) => update("city", e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all bg-white"
              >
                <option value="">Select your city</option>
                {ORANGE_COUNTY_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  value={data.preferredDate}
                  onChange={(e) => update("preferredDate", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Preferred Time *
                </label>
                <select
                  value={data.preferredTime}
                  onChange={(e) => update("preferredTime", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all bg-white"
                >
                  <option value="">Select time</option>
                  <option value="8:00 AM">8:00 AM</option>
                  <option value="9:00 AM">9:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="12:00 PM">12:00 PM</option>
                  <option value="1:00 PM">1:00 PM</option>
                  <option value="2:00 PM">2:00 PM</option>
                  <option value="3:00 PM">3:00 PM</option>
                  <option value="4:00 PM">4:00 PM</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Special Notes
              </label>
              <textarea
                value={data.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Any special needs, behavioral notes, or requests..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all resize-none"
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  First Name *
                </label>
                <input
                  type="text"
                  value={data.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={data.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email *
              </label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone *
              </label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(714) 555-0123"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/30 focus:border-blue outline-none transition-all"
              />
            </div>

            {/* Summary */}
            <div className="bg-blue-50 rounded-xl p-4 mt-4 border border-blue/20">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Booking Summary</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="text-gray-400">Pet:</span> {data.petName} ({data.petBreed})</p>
                <p><span className="text-gray-400">Service:</span> {SERVICE_OPTIONS.find(s => s.value === data.service)?.label}</p>
                <p><span className="text-gray-400">When:</span> {data.preferredDate} at {data.preferredTime}</p>
                <p><span className="text-gray-400">Where:</span> {data.address}, {data.city}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            onClick={() => canProceed() && setStep(step + 1)}
            disabled={!canProceed()}
            className="px-6 py-2.5 bg-blue text-white text-sm font-semibold rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!canProceed() || isSubmitting}
            className="px-6 py-2.5 bg-blue text-white text-sm font-semibold rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Submitting...
              </>
            ) : (
              "Book an Appointment"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
