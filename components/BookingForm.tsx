"use client";

import { useState } from "react";
import {
  PET_SIZES,
} from "@/lib/constants";
import {
  GROOMING_SERVICES,
  formatPrice,
  getServiceLabel,
  getServicePrice,
} from "@/lib/pricing";
import WeekAvailabilityPicker from "@/components/scheduling/WeekAvailabilityPicker";
import SmsOptInField from "@/components/SmsOptInField";
import Link from "next/link";
import { legalRoutes } from "@/lib/company-legal";
import type { AvailableSlot } from "@/lib/scheduling/types";
import { formatAppointmentAddress, isValidZipCode } from "@/lib/scheduling/address";

interface BookingFormData {
  petName: string;
  petBreed: string;
  petSize: string;
  service: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  smsOptIn: boolean;
  address: string;
  city: string;
  zipCode: string;
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
  smsOptIn: false,
  address: "",
  city: "",
  zipCode: "",
  preferredDate: "",
  preferredTime: "",
  slotKey: "",
  groomerName: "",
  notes: "",
};

const STEPS = [
  { id: 1, title: "Your Pet", subtitle: "Tell us about your furry friend" },
  { id: 2, title: "Service", subtitle: "Choose your grooming package" },
  { id: 3, title: "Location", subtitle: "Where should we meet you?" },
  { id: 4, title: "Schedule", subtitle: "Pick an open slot with your groomer" },
  { id: 5, title: "Contact", subtitle: "How can we reach you?" },
];

const TOTAL_STEPS = STEPS.length;

interface BookingFormProps {
  onClose?: () => void;
  /** `book-page` = /book with phone + SMS opt-in on step 1. Default `modal` for popups. */
  variant?: "modal" | "book-page";
}

export default function BookingForm({ onClose, variant = "modal" }: BookingFormProps) {
  const isBookPage = variant === "book-page";
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingFormData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const update = (field: keyof BookingFormData, value: string | boolean) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedPrice =
    data.petSize && data.service
      ? getServicePrice(data.petSize, data.service)
      : null;

  const selectSlot = (slot: AvailableSlot) => {
    setData((prev) => ({
      ...prev,
      slotKey: slot.slotKey,
      preferredDate: slot.date,
      preferredTime: slot.displayTime,
      groomerName: slot.groomerName,
    }));
  };

  const clearSchedule = () => {
    setData((prev) => ({
      ...prev,
      slotKey: "",
      preferredDate: "",
      preferredTime: "",
      groomerName: "",
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        if (isBookPage) {
          return (
            data.petName &&
            data.petBreed &&
            data.petSize &&
            data.phone.trim() &&
            (!data.smsOptIn || data.phone.trim())
          );
        }
        return data.petName && data.petBreed && data.petSize;
      case 2:
        return data.service && data.petSize;
      case 3:
        return Boolean(
          data.address.trim() && data.city.trim() && isValidZipCode(data.zipCode)
        );
      case 4:
        return Boolean(data.slotKey);
      case 5:
        return isBookPage
          ? Boolean(data.firstName && data.lastName && data.email)
          : Boolean(data.firstName && data.lastName && data.email && data.phone);
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload = isBookPage ? data : { ...data, smsOptIn: false };

      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <div className="flex flex-col min-h-0 h-full">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors ${
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

      <div className="px-6 py-6 flex-1 min-h-0 overflow-y-auto scrollbar-grey">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PET_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => {
                      update("petSize", size.value);
                      update("service", "");
                      clearSchedule();
                    }}
                    className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-center ${
                      data.petSize === size.value
                        ? "border-brand-bright bg-brand-bright/10 text-brand-bright"
                        : "border-gray-200 text-gray-700 hover:border-brand-bright/50"
                    }`}
                  >
                    <span className="block leading-tight">{size.title}</span>
                    <span className="block text-sm mt-1 leading-tight opacity-80">
                      ({size.weight})
                    </span>
                  </button>
                ))}
              </div>
            </div>
            {isBookPage && (
              <>
                <div>
                  <label htmlFor="book-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    id="book-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={data.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="(714) 555-0123"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
                  />
                </div>
                <SmsOptInField
                  checked={data.smsOptIn}
                  onChange={(checked) => update("smsOptIn", checked)}
                  id="book-sms-opt-in"
                />
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {!data.petSize ? (
              <p className="text-sm text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                Go back and select your dog&apos;s size to see pricing.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600">
                  Pricing for{" "}
                  <strong>{PET_SIZES.find((s) => s.value === data.petSize)?.label}</strong>
                </p>
                <div className="space-y-3">
                  {GROOMING_SERVICES.map((service) => {
                    const price = getServicePrice(data.petSize, service.value);
                    return (
                      <button
                        key={service.value}
                        type="button"
                        onClick={() => {
                          update("service", service.value);
                          clearSchedule();
                        }}
                        className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all ${
                          data.service === service.value
                            ? "border-brand-bright bg-brand-bright/10"
                            : "border-gray-200 hover:border-brand-bright/50"
                        }`}
                      >
                        <span className="font-medium text-gray-900">{service.label}</span>
                        <span className="text-sm text-brand-bright font-semibold">
                          {price != null ? formatPrice(price) : "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">City *</label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="e.g. Irvine"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ZIP Code *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={data.zipCode}
                  onChange={(e) => update("zipCode", e.target.value)}
                  placeholder="92618"
                  maxLength={10}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              We come to your curb anywhere in Orange County.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Service at{" "}
              <strong>
                {formatAppointmentAddress({
                  address: data.address,
                  city: data.city,
                  zipCode: data.zipCode,
                })}
              </strong>
            </p>
            {!data.service ? (
              <p className="text-sm text-gray-500">Choose a service first to see open appointments.</p>
            ) : (
              <WeekAvailabilityPicker
                service={data.service}
                selectedDate={data.preferredDate}
                selectedSlotKey={data.slotKey}
                onSelectDate={(date) => {
                  update("preferredDate", date);
                  update("slotKey", "");
                  update("preferredTime", "");
                  update("groomerName", "");
                }}
                onSelectSlot={selectSlot}
              />
            )}
          </div>
        )}

        {step === 5 && (
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
            {!isBookPage && (
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
            )}

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

            <div className="bg-brand-light rounded-xl p-4 mt-4 border border-accent/20">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">Booking Summary</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="text-gray-400">Pet:</span> {data.petName} ({data.petBreed})</p>
                <p>
                  <span className="text-gray-400">Service:</span>{" "}
                  {getServiceLabel(data.service)}
                  {selectedPrice != null && ` — ${formatPrice(selectedPrice)}`}
                </p>
                <p><span className="text-gray-400">When:</span> {data.preferredDate} at {data.preferredTime}</p>
                <p><span className="text-gray-400">Groomer:</span> {data.groomerName}</p>
                <p>
                  <span className="text-gray-400">Where:</span>{" "}
                  {formatAppointmentAddress({
                    address: data.address,
                    city: data.city,
                    zipCode: data.zipCode,
                  })}
                </p>
                {data.phone && (
                  <p><span className="text-gray-400">Phone:</span> {data.phone}</p>
                )}
              </div>
            </div>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            {isBookPage && (
              <p className="text-xs leading-relaxed text-gray-500">
                By booking, you agree to our{" "}
                <Link href={legalRoutes.privacy} className="font-medium text-brand hover:text-accent">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href={legalRoutes.terms} className="font-medium text-brand hover:text-accent">
                  Terms &amp; Conditions
                </Link>
                .
              </p>
            )}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-4 shrink-0">
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

        {step < TOTAL_STEPS ? (
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
