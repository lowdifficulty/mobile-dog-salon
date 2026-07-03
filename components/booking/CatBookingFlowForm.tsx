"use client";

import { useEffect, useState } from "react";
import {
  CAT_GROOMING_SERVICES,
  CAT_PET_SIZE,
  formatPrice,
  getCatQuotedServicePrice,
  getCatServiceListPrice,
  getServiceLabel,
} from "@/lib/pricing";
import WeekAvailabilityPicker from "@/components/scheduling/WeekAvailabilityPicker";
import AddToCalendarButtons from "@/components/booking/AddToCalendarButtons";
import BookingOptionButton from "@/components/booking/BookingOptionButton";
import BookingOptionList from "@/components/booking/BookingOptionList";
import type { AvailableSlot } from "@/lib/scheduling/types";
import { parseSlotKey, slotToISO } from "@/lib/scheduling/slots";
import { formatBookingBlockDisplay, groomerClientDisplayName } from "@/lib/scheduling/groomers";
import { isValidBookingContact } from "@/lib/scheduling/address";
import type { CalendarEventDetails } from "@/lib/calendar-links";
import { pingLeadActivity, saveLead, type SaveLeadPayload } from "@/lib/leads/client";
import { warmMetaPixel } from "@/lib/meta-pixel";
import type { LeadFunnelStep } from "@/lib/leads/types";
import { BOOKING_DISCOUNT_BONUS } from "@/lib/booking/dog-service-packages";
import {
  buildBookingNotes,
  formatPetNames,
  formatPetsList,
  type BookingPet,
} from "@/lib/booking/pets";
import { holdBookingSlot } from "@/lib/booking/slot-hold-client";
import {
  bookingInputClass,
  getDevSkipBookableDate,
  isLocalhostHost,
  isValidBookingPhone,
  splitBookingName,
} from "@/lib/booking/form-utils";

const STEP_COUNT = 3;

const CAT_PET: BookingPet = { petName: "", petSize: CAT_PET_SIZE };

interface BookingFormData {
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

interface CatBookingFlowFormProps {
  onClose?: () => void;
}

export default function CatBookingFlowForm({ onClose }: CatBookingFlowFormProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingFormData>(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [slotHoldError, setSlotHoldError] = useState("");
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [fromFallback, setFromFallback] = useState(false);

  const discountActive = true;

  useEffect(() => {
    setIsLocalhost(isLocalhostHost());
    warmMetaPixel();
    void saveLead({
      funnelStep: "view_form",
      source: "booking",
      petSize: CAT_PET_SIZE,
      pets: [CAT_PET],
    });
    void pingLeadActivity();
    const interval = window.setInterval(() => {
      void pingLeadActivity();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const update = (field: keyof BookingFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedPrice = data.service
    ? getCatQuotedServicePrice(data.service, discountActive)
    : null;

  const listPrice = data.service ? getCatServiceListPrice(data.service) : null;

  const persistLead = (funnelStep: LeadFunnelStep, extra?: Partial<SaveLeadPayload>) => {
    void saveLead({
      funnelStep,
      phone: data.phone,
      fullName: data.fullName,
      petSize: CAT_PET_SIZE,
      pets: [CAT_PET],
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

  const selectSlot = async (slot: AvailableSlot) => {
    setSlotHoldError("");
    if (!isLocalhost) {
      const hold = await holdBookingSlot(slot.slotKey);
      if (!hold.ok) {
        setSlotHoldError(hold.error);
        return;
      }
    }
    setData((prev) => ({
      ...prev,
      slotKey: slot.slotKey,
      preferredDate: slot.date,
      preferredTime: slot.displayTime,
      groomerName: slot.groomerName,
    }));
    const { groomerId, date, time } = parseSlotKey(slot.slotKey);
    persistLead("schedule_appointment", {
      groomerId,
      groomerName: slot.groomerName,
      appointmentStartAt: slotToISO(date, time),
    });
    setStep(3);
  };

  const handleSkipAppointmentStep = () => {
    const groomerId = "melanie";
    const date = getDevSkipBookableDate();
    const time = "10:00";
    const slotKey = `${groomerId}|${date}|${time}`;
    setData((prev) => ({
      ...prev,
      slotKey,
      preferredDate: date,
      preferredTime: formatBookingBlockDisplay(time),
      groomerName: groomerClientDisplayName(groomerId),
    }));
    persistLead("schedule_appointment", {
      groomerId,
      groomerName: groomerClientDisplayName(groomerId),
      appointmentStartAt: slotToISO(date, time),
    });
    setStep(3);
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
    setStep(2);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return Boolean(data.service);
      case 2:
        return Boolean(data.slotKey);
      case 3:
        return isValidBookingContact(data.address, data.city, data.zipCode) && isValidBookingPhone(data.phone);
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setIsSubmitting(true);
    setSubmitError("");

    persistLead("address", { phone: data.phone, smsOptIn: true });

    const phoneTrimmed = data.phone.trim();
    const { firstName, lastName } = data.fullName.trim()
      ? splitBookingName(data.fullName)
      : { firstName: "Customer", lastName: "Guest" };
    const { address, city, zipCode } = data;

    try {
      if (!isLocalhost) {
        const hold = await holdBookingSlot(data.slotKey);
        if (!hold.ok) {
          setSubmitError(hold.error);
          setIsSubmitting(false);
          return;
        }
      }

      const res = await fetch("/api/book", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotKey: data.slotKey,
          fromFallback: fromFallback || isLocalhost,
          petName: "",
          petBreed: "Cat",
          petSize: CAT_PET_SIZE,
          service: data.service,
          firstName,
          lastName,
          phone: data.phone,
          smsOptIn: true,
          address,
          city,
          zipCode,
          notes: [
            buildBookingNotes(discountActive, []),
            "Cat grooming booking",
          ]
            .filter(Boolean)
            .join(". "),
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
        petSize: CAT_PET_SIZE,
        pets: [CAT_PET],
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
        petName: formatPetNames([CAT_PET]),
        petSize: CAT_PET_SIZE,
        service: data.service,
        firstName: splitBookingName(data.fullName).firstName,
        lastName: splitBookingName(data.fullName).lastName,
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

  const appointmentSummary = (discountHeading = "50% discount activated") => (
    <div className="booking-form-summary">
      <p className="booking-form-summary-title">{discountHeading}</p>
    </div>
  );

  if (submitted && calendarDetails) {
    return (
      <div className="py-6 px-4 overflow-y-auto scrollbar-grey">
        <div className="text-center">
          <div className="booking-form-success-icon">
            <svg className="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-bold text-xl text-gray-900 mb-2">You&apos;re booked!</h3>
          <p className="text-sm text-gray-700 mb-2 max-w-md mx-auto">
            Thanks{splitBookingName(data.fullName).firstName ? `, ${splitBookingName(data.fullName).firstName}` : ""}!
            Your cat is scheduled with <strong>{data.groomerName}</strong> on {data.preferredDate} at{" "}
            {data.preferredTime}.
          </p>
          {selectedPrice != null && (
            <p className="text-sm text-gray-700 font-normal mb-2">
              Your 50% discount is applied — {formatPrice(selectedPrice)} for this visit.
            </p>
          )}
          <p className="text-xs text-gray-500 mb-6">You&apos;ll receive a confirmation text shortly.</p>
        </div>
        <div className="max-w-md mx-auto">
          <AddToCalendarButtons details={calendarDetails} />
        </div>
        {onClose && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className="flex flex-col" autoComplete="on" onSubmit={(e) => e.preventDefault()}>
      <div className="px-4 pt-3 pb-2 border-b border-gray-200 shrink-0 relative">
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
                  step >= id ? "booking-form-step-active" : "booking-form-step-inactive"
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
                    step > id ? "booking-form-step-line-active" : "booking-form-step-line-inactive"
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
            <div className="booking-form-discount">50% discount applied — all cats same price</div>
            <div>
              <h3 className="booking-form-heading">Select cat grooming service</h3>
              <p className="booking-form-subheading">Tap a package to continue.</p>
            </div>
            <BookingOptionList>
              {CAT_GROOMING_SERVICES.map((service, index) => {
                const quoted = getCatQuotedServicePrice(service.value, discountActive);
                const subtitle =
                  quoted != null ? `${formatPrice(quoted)} with discount applied` : undefined;
                return (
                  <BookingOptionButton
                    key={service.value}
                    title={service.label}
                    subtitle={subtitle}
                    bullets={service.bullets}
                    variant="text"
                    isFirst={index === 0}
                    isLast={index === CAT_GROOMING_SERVICES.length - 1}
                    selected={data.service === service.value}
                    onClick={() => handleSelectService(service.value)}
                  />
                );
              })}
            </BookingOptionList>
            <p className="text-xs font-bold text-gray-700 text-center px-1">
              {BOOKING_DISCOUNT_BONUS}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <h3 className="booking-form-heading">Pick a time</h3>
              <p className="booking-form-subheading">Tap a time to continue.</p>
            </div>
            <div className="booking-form-summary-box space-y-0.5">
              <p>
                <span className="text-gray-900 font-semibold">Cat:</span> {formatPetsList([CAT_PET])} —{" "}
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
                setSlotHoldError("");
              }}
              onSelectSlot={selectSlot}
              onAvailabilityMeta={({ fallbackMode, devAllSlots }) => {
                setFromFallback(fallbackMode || devAllSlots);
              }}
            />
            {slotHoldError ? (
              <p className="text-sm text-red-600" role="alert">
                {slotHoldError}
              </p>
            ) : null}
            {isLocalhost && (
              <button
                type="button"
                onClick={handleSkipAppointmentStep}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 border border-dashed border-gray-300 rounded-xl hover:text-gray-900 hover:border-gray-400"
              >
                Skip (localhost only)
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {appointmentSummary()}
            {!isLocalhost && data.slotKey ? (
              <p className="text-xs text-gray-600 font-medium">
                Your time is held for 10 minutes while you finish booking.
              </p>
            ) : null}
            <div className="space-y-3">
              <h3 className="booking-form-heading">Address</h3>
              <div>
                <label htmlFor="cat-booking-address" className="block text-xs font-medium text-gray-700 mb-1">
                  Street address *
                </label>
                <input
                  id="cat-booking-address"
                  name="address"
                  type="text"
                  value={data.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="123 Main St"
                  autoComplete="street-address"
                  className={bookingInputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cat-booking-city" className="block text-xs font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    id="cat-booking-city"
                    name="city"
                    type="text"
                    value={data.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="Irvine"
                    autoComplete="address-level2"
                    className={bookingInputClass}
                  />
                </div>
                <div>
                  <label htmlFor="cat-booking-zip" className="block text-xs font-medium text-gray-700 mb-1">
                    ZIP code *
                  </label>
                  <input
                    id="cat-booking-zip"
                    name="zip"
                    type="text"
                    inputMode="numeric"
                    value={data.zipCode}
                    onChange={(e) => update("zipCode", e.target.value)}
                    placeholder="92618"
                    autoComplete="postal-code"
                    className={bookingInputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cat-booking-phone" className="block text-xs font-medium text-gray-700 mb-1">
                  Phone Number for Text Confirmation *
                </label>
                <input
                  id="cat-booking-phone"
                  name="tel"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={data.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(714) 555-0123"
                  className={bookingInputClass}
                />
              </div>
            </div>
            {submitError && <p className="text-xs text-red-600">{submitError}</p>}
          </div>
        )}
      </div>

      {step > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex flex-col gap-2 shrink-0">
          {step === 3 && (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canProceed() || isSubmitting}
              className="w-full px-5 py-3 site-btn text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Booking…" : "Book Appointment"}
            </button>
          )}

          <button
            type="button"
            onClick={handleBack}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Back
          </button>
        </div>
      )}
    </form>
  );
}
