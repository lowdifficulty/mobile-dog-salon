"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PET_SIZES } from "@/lib/constants";
import {
  formatPrice,
  getListServicePrice,
  getQuotedServicePrice,
  getServiceLabel,
} from "@/lib/pricing";
import WeekAvailabilityPicker from "@/components/scheduling/WeekAvailabilityPicker";
import AddToCalendarButtons from "@/components/booking/AddToCalendarButtons";
import BookingOptionButton, {
  DogSizeIcon,
} from "@/components/booking/BookingOptionButton";
import { legalRoutes } from "@/lib/company-legal";
import type { AvailableSlot } from "@/lib/scheduling/types";
import { parseSlotKey, slotToISO } from "@/lib/scheduling/slots";
import { isValidBookingContact } from "@/lib/scheduling/address";
import type { CalendarEventDetails } from "@/lib/calendar-links";
import { pingLeadActivity, saveLead, type SaveLeadPayload } from "@/lib/leads/client";
import type { LeadFunnelStep } from "@/lib/leads/types";
import {
  buildBookingNotes,
  draftToBookingPet,
  formatPetNames,
  formatPetsList,
  type BookingPet,
} from "@/lib/booking/pets";

const SERVICE_OPTIONS = [
  { value: "full-groom", label: "Bath & Haircut" },
  { value: "bath-brush", label: "Bath Only" },
];

interface BookingFormData {
  petSize: string;
  service: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  preferredDate: string;
  preferredTime: string;
  slotKey: string;
  groomerName: string;
}

const initialData: BookingFormData = {
  petSize: "",
  service: "",
  fullName: "",
  phone: "",
  address: "",
  city: "",
  zipCode: "",
  preferredDate: "",
  preferredTime: "",
  slotKey: "",
  groomerName: "",
};

const STEP_COUNT = 4;

const inputClass =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

interface BookingFlowFormProps {
  onClose?: () => void;
}

export default function BookingFlowForm({ onClose }: BookingFlowFormProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingFormData>(initialData);
  const [bookingPets, setBookingPets] = useState<BookingPet[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const discountActive = true;

  useEffect(() => {
    void pingLeadActivity();
    const interval = window.setInterval(() => {
      void pingLeadActivity();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const update = (field: keyof BookingFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedPrice =
    data.petSize && data.service
      ? getQuotedServicePrice(data.petSize, data.service, discountActive)
      : null;

  const selectSlot = (slot: AvailableSlot) => {
    setData((prev) => ({
      ...prev,
      slotKey: slot.slotKey,
      preferredDate: slot.date,
      preferredTime: slot.displayTime,
      groomerName: slot.groomerName,
    }));
    setStep(4);
  };

  const getDraftBookingPets = (): BookingPet[] => {
    if (bookingPets.length) return bookingPets;
    if (data.petSize) return [{ petName: "", petSize: data.petSize }];
    return [];
  };

  const persistLead = (funnelStep: LeadFunnelStep, extra?: Partial<SaveLeadPayload>) => {
    const activePets = getDraftBookingPets();
    void saveLead({
      funnelStep,
      phone: data.phone,
      fullName: data.fullName,
      petSize: activePets[0]?.petSize ?? data.petSize,
      pets: activePets.length ? activePets : undefined,
      service: data.service,
      address: data.address,
      city: data.city,
      zipCode: data.zipCode,
      discountActive,
      smsOptIn: Boolean(data.phone.trim()),
      source: "booking",
      ...extra,
    });
  };

  const handleSelectSize = (size: string) => {
    const pets = [{ size }].map(draftToBookingPet);
    setBookingPets(pets);
    setData((prev) => ({
      ...prev,
      petSize: size,
      service: "",
      slotKey: "",
      preferredDate: "",
      preferredTime: "",
      groomerName: "",
    }));
    persistLead("pet_info", {
      petSize: size,
      pets,
    });
    setStep(2);
  };

  const handleSelectService = (service: string) => {
    setData((prev) => ({
      ...prev,
      service,
      slotKey: "",
      preferredDate: "",
      preferredTime: "",
      groomerName: "",
    }));
    persistLead("package_selected", { service });
    setStep(3);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return Boolean(data.petSize);
      case 2:
        return Boolean(data.service);
      case 3:
        return Boolean(data.slotKey);
      case 4:
        return Boolean(
          data.fullName.trim() &&
            data.phone.trim().length >= 10 &&
            isValidBookingContact(data.address, data.city, data.zipCode)
        );
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setIsSubmitting(true);
    setSubmitError("");

    const { firstName, lastName } = splitName(data.fullName);
    const { address, city, zipCode } = data;
    const finalizedPets = getDraftBookingPets();
    const additionalPets = finalizedPets.slice(1);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotKey: data.slotKey,
          petName: "",
          petBreed: "",
          petSize: finalizedPets[0]?.petSize ?? data.petSize,
          additionalPets: additionalPets.length ? additionalPets : undefined,
          service: data.service,
          firstName,
          lastName,
          phone: data.phone,
          smsOptIn: true,
          address,
          city,
          zipCode,
          notes: buildBookingNotes(discountActive, additionalPets),
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setSubmitError(result.error ?? "Could not book that slot. Please pick another time.");
        setIsSubmitting(false);
        return;
      }
      setAppointmentId(result.appointmentId);
      const { groomerId, date, time } = parseSlotKey(data.slotKey);
      void saveLead({
        funnelStep: "scheduled",
        phone: data.phone,
        fullName: data.fullName,
        petSize: finalizedPets[0]?.petSize ?? data.petSize,
        pets: finalizedPets,
        service: data.service,
        address,
        city,
        zipCode,
        discountActive,
        smsOptIn: true,
        appointmentId: result.appointmentId,
        scheduledAt: new Date().toISOString(),
        appointmentStartAt: slotToISO(date, time),
        groomerId,
        groomerName: data.groomerName,
        source: "booking",
      });
      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }

    setIsSubmitting(false);
  };

  const calendarDetails: CalendarEventDetails | null = submitted
    ? {
        petName: formatPetNames(getDraftBookingPets()),
        petSize: data.petSize,
        service: data.service,
        firstName: splitName(data.fullName).firstName,
        lastName: splitName(data.fullName).lastName,
        phone: data.phone,
        email: "",
        address: data.address,
        city: data.city,
        zipCode: data.zipCode,
        groomerName: data.groomerName,
        preferredDate: data.preferredDate,
        preferredTime: data.preferredTime,
        slotKey: data.slotKey,
        appointmentId,
      }
    : null;

  if (submitted && calendarDetails) {
    const bookedPets = getDraftBookingPets();
    const petLabel = formatPetNames(bookedPets);

    return (
      <div className="py-6 px-4 overflow-y-auto scrollbar-grey">
        <div className="text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-bold text-xl text-gray-900 mb-2">You&apos;re booked!</h3>
          <p className="text-sm text-gray-600 mb-2 max-w-md mx-auto">
            Thanks, {splitName(data.fullName).firstName}! <strong>{petLabel}</strong>{" "}
            {bookedPets.length > 1 ? "are" : "is"} scheduled with{" "}
            <strong>{data.groomerName}</strong> on {data.preferredDate} at {data.preferredTime}.
          </p>
          {selectedPrice != null && (
            <p className="text-sm font-semibold text-brand mb-2">
              Your 50% discount is applied — {formatPrice(selectedPrice)} for this visit.
            </p>
          )}
          <p className="text-xs text-gray-500 mb-6">
            You&apos;ll receive a confirmation text shortly.
          </p>
        </div>
        <div className="max-w-md mx-auto">
          <AddToCalendarButtons details={calendarDetails} />
        </div>
        {onClose && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      className="flex flex-col"
      autoComplete="on"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 shrink-0 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close booking form"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className={`flex items-center justify-between ${onClose ? "pr-10" : ""}`}>
          {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((id, i) => (
            <div key={id} className="flex items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
                  step >= id ? "bg-brand text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {step > id ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  id
                )}
              </div>
              {i < STEP_COUNT - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1.5 transition-colors ${
                    step > id ? "bg-brand-bright" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">What size dog do you have?</h3>
              <p className="text-xs text-gray-500 mt-1">Tap a size to continue.</p>
            </div>
            <div className="space-y-2">
              {PET_SIZES.map((size, index) => (
                <BookingOptionButton
                  key={size.value}
                  index={index + 1}
                  title={size.title}
                  subtitle={size.weight}
                  icon={<DogSizeIcon size={size.value as "small" | "medium" | "large"} />}
                  iconSurface="image"
                  selected={data.petSize === size.value}
                  onClick={() => handleSelectSize(size.value)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
              50% discount applied
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Select service</h3>
              <p className="text-xs text-gray-500 mt-1">Tap a package to continue.</p>
            </div>
            <div className="space-y-2">
              {SERVICE_OPTIONS.map((service, index) => {
                const quoted = getQuotedServicePrice(data.petSize, service.value, discountActive);
                const list = getListServicePrice(data.petSize, service.value);
                const detail =
                  list != null && quoted != null
                    ? `${formatPrice(list)} (${formatPrice(quoted)} w/ discount)`
                    : undefined;
                return (
                  <BookingOptionButton
                    key={service.value}
                    index={index + 1}
                    title={service.label}
                    detail={detail}
                    selected={data.service === service.value}
                    onClick={() => handleSelectService(service.value)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Pick a time</h3>
              <p className="text-xs text-gray-500 mt-1">Tap a time to continue.</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 space-y-0.5">
              <p>
                <span className="text-gray-400">Pets:</span> {formatPetsList(getDraftBookingPets())} —{" "}
                {getServiceLabel(data.service)}
                {selectedPrice != null && ` (${formatPrice(selectedPrice)})`}
              </p>
            </div>
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
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Your contact info</h3>
              <p className="text-xs text-gray-500 mt-1">
                {data.preferredDate} at {data.preferredTime} with {data.groomerName}
              </p>
            </div>
            <div>
              <label htmlFor="booking-name" className="block text-xs font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                id="booking-name"
                name="name"
                type="text"
                value={data.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="booking-phone" className="block text-xs font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                id="booking-phone"
                name="tel"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(714) 555-0123"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="booking-address" className="block text-xs font-medium text-gray-700 mb-1">
                Street address *
              </label>
              <input
                id="booking-address"
                name="address"
                type="text"
                value={data.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="123 Main St"
                autoComplete="street-address"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="booking-city" className="block text-xs font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  id="booking-city"
                  name="city"
                  type="text"
                  value={data.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Irvine"
                  autoComplete="address-level2"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="booking-zip" className="block text-xs font-medium text-gray-700 mb-1">
                  ZIP code *
                </label>
                <input
                  id="booking-zip"
                  name="zip"
                  type="text"
                  inputMode="numeric"
                  value={data.zipCode}
                  onChange={(e) => update("zipCode", e.target.value)}
                  placeholder="92618"
                  autoComplete="postal-code"
                  className={inputClass}
                />
              </div>
            </div>
            {submitError && <p className="text-xs text-red-600">{submitError}</p>}
            <p className="text-[11px] leading-relaxed text-gray-500">
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
          </div>
        )}
      </div>

      {step > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Back
          </button>

          {step === 4 && (
            <button
              type="button"
              onClick={() => {
                persistLead("contact_details");
                void handleSubmit();
              }}
              disabled={!canProceed() || isSubmitting}
              className="px-5 py-2 bg-brand text-white text-sm font-semibold rounded-full hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Booking…" : "Book Appointment"}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
