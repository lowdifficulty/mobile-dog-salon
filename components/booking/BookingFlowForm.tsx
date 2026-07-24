"use client";

import { useCallback, useEffect, useState } from "react";
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
import BookingOptionList from "@/components/booking/BookingOptionList";
import type { AvailableSlot } from "@/lib/scheduling/types";
import {
  BOOKING_DISCOUNT_BONUS,
  DOG_SERVICE_PACKAGES,
} from "@/lib/booking/dog-service-packages";
import { parseSlotKey, slotToISO, getTodayPacificDate, isBookableDate } from "@/lib/scheduling/slots";
import {
  defaultBookableGroomerId,
  formatBookingBlockDisplay,
  resolveGroomerClientDisplayName,
} from "@/lib/scheduling/groomers";
import {
  isValidBookingContact,
} from "@/lib/scheduling/address";
import type { CalendarEventDetails } from "@/lib/calendar-links";
import { pingLeadActivity, saveLead, type SaveLeadPayload } from "@/lib/leads/client";
import { warmMetaPixel } from "@/lib/meta-pixel";
import type { LeadFunnelStep } from "@/lib/leads/types";
import {
  buildBookingNotes,
  draftToBookingPet,
  formatPetNames,
  formatPetsList,
  type BookingPet,
} from "@/lib/booking/pets";
import { holdBookingSlot } from "@/lib/booking/slot-hold-client";
import type { BookingVariant } from "@/lib/booking/variants";

const STEP_COUNT = 4;

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

function isValidBookingPhone(phone: string): boolean {
  return phone.trim().replace(/\D/g, "").length >= 10;
}

const inputClass = "booking-form-input";

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function isLocalhostHost(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function getDevSkipBookableDate(): string {
  const today = getTodayPacificDate();
  const [year, month, day] = today.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day + 1, 12));
  const next = probe.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return isBookableDate(next) ? next : today;
}

interface BookingFlowFormProps {
  onClose?: () => void;
  variant?: BookingVariant | null;
}

export default function BookingFlowForm({ onClose, variant = null }: BookingFlowFormProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingFormData>(initialData);
  const [bookingPets, setBookingPets] = useState<BookingPet[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [slotHoldError, setSlotHoldError] = useState("");
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [fromFallback, setFromFallback] = useState(false);

  const handleAvailabilityMeta = useCallback(
    ({ fallbackMode, devAllSlots }: { fallbackMode: boolean; devAllSlots: boolean }) => {
      setFromFallback(fallbackMode || devAllSlots);
    },
    []
  );

  const discountActive = true;
  const leadSource = variant?.leadSource ?? "booking";
  const groomerFilter = variant?.groomerId;
  const groomerIds = variant?.groomerIds;
  const groomerDisplayNames = variant?.groomerDisplayNames;

  const displayGroomerName = (groomerId: Parameters<typeof resolveGroomerClientDisplayName>[0]) =>
    resolveGroomerClientDisplayName(groomerId, groomerDisplayNames);

  useEffect(() => {
    setIsLocalhost(isLocalhostHost());
    warmMetaPixel();
    void saveLead({ funnelStep: "view_form", source: leadSource });
    void pingLeadActivity();
    const interval = window.setInterval(() => {
      void pingLeadActivity();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [leadSource]);

  useEffect(() => {
    if (!variant) return;
    setData((prev) => ({
      ...prev,
      city: prev.city || variant.defaultCity,
    }));
  }, [variant]);

  const update = (field: keyof BookingFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const selectedPrice =
    data.petSize && data.service
      ? getQuotedServicePrice(data.petSize, data.service, discountActive)
      : null;

  const listPrice =
    data.petSize && data.service ? getListServicePrice(data.petSize, data.service) : null;

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
    setStep(4);
  };

  const handleSkipAppointmentStep = () => {
    const groomerId = groomerFilter ?? defaultBookableGroomerId();
    const date = getDevSkipBookableDate();
    const time = "10:00";
    const slotKey = `${groomerId}|${date}|${time}`;
    setData((prev) => ({
      ...prev,
      slotKey,
      preferredDate: date,
      preferredTime: formatBookingBlockDisplay(time),
      groomerName: displayGroomerName(groomerId),
    }));
    persistLead("schedule_appointment", {
      groomerId,
      groomerName: displayGroomerName(groomerId),
      appointmentStartAt: slotToISO(date, time),
    });
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
      source: leadSource,
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
      ? splitName(data.fullName)
      : { firstName: "Customer", lastName: "Guest" };
    const { address, city, zipCode } = data;
    const finalizedPets = getDraftBookingPets();
    const additionalPets = finalizedPets.slice(1);

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
        source: leadSource,
        metaConversionValue: selectedPrice ?? undefined,
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

  const discountBanner = (
    <div className="booking-form-discount mb-3">50% discount applied</div>
  );

  if (submitted && calendarDetails) {
    const bookedPets = getDraftBookingPets();
    const petLabel = formatPetNames(bookedPets);

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
            Thanks{splitName(data.fullName).firstName ? `, ${splitName(data.fullName).firstName}` : ""}!{" "}
            <strong>{petLabel}</strong>{" "}
            {bookedPets.length > 1 ? "are" : "is"} scheduled with{" "}
            <strong>{data.groomerName}</strong> on {data.preferredDate} at {data.preferredTime}.
          </p>
          {selectedPrice != null && (
            <p className="text-sm text-gray-700 font-normal mb-2">
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
    <form
      className="flex flex-col"
      autoComplete="on"
      onSubmit={(e) => e.preventDefault()}
    >
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
        {discountBanner}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <h3 className="booking-form-heading">What size dog do you have?</h3>
              <p className="booking-form-subheading">Tap a size to continue.</p>
            </div>
            <BookingOptionList>
              {PET_SIZES.map((size, index) => (
                <BookingOptionButton
                  key={size.value}
                  title={size.title.replace(" Dog", "")}
                  subtitle={`(${size.weight})`}
                  icon={<DogSizeIcon size={size.value as "small" | "medium" | "large"} />}
                  variant="picture"
                  isFirst={index === 0}
                  isLast={index === PET_SIZES.length - 1}
                  selected={data.petSize === size.value}
                  onClick={() => handleSelectSize(size.value)}
                />
              ))}
            </BookingOptionList>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <h3 className="booking-form-heading">Select service</h3>
              <p className="booking-form-subheading">Tap a package to continue.</p>
            </div>
            <BookingOptionList>
              {DOG_SERVICE_PACKAGES.map((service, index) => {
                const quoted = getQuotedServicePrice(data.petSize, service.value, discountActive);
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
                    isLast={index === DOG_SERVICE_PACKAGES.length - 1}
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

        {step === 3 && (
          <div className="space-y-3">
            <div>
              <h3 className="booking-form-heading">Pick a time</h3>
              <p className="booking-form-subheading">Tap a time to continue.</p>
            </div>
            <div className="booking-form-summary-box space-y-0.5">
              <p>
                <span className="text-gray-900 font-semibold">Pets:</span> {formatPetsList(getDraftBookingPets())} —{" "}
                {getServiceLabel(data.service)}
                {selectedPrice != null && ` (${formatPrice(selectedPrice)})`}
              </p>
            </div>
            <WeekAvailabilityPicker
              service={data.service}
              groomerId={groomerFilter}
              groomerIds={groomerIds}
              groomerDisplayNames={groomerDisplayNames}
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
              onAvailabilityMeta={handleAvailabilityMeta}
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

        {step === 4 && (
          <div className="space-y-4">
            {!isLocalhost && data.slotKey ? (
              <p className="text-xs text-gray-600 font-medium">
                Your time is held for 10 minutes while you finish booking.
              </p>
            ) : null}
            <div className="space-y-3">
              <h3 className="booking-form-heading">Address</h3>
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
                    placeholder={variant?.defaultCity ?? "Irvine"}
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
                    placeholder={variant?.zipPlaceholder ?? "92618"}
                    autoComplete="postal-code"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="booking-phone" className="block text-xs font-medium text-gray-700 mb-1">
                  Phone Number for Text Confirmation *
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
            </div>
            {submitError && <p className="text-xs text-red-600">{submitError}</p>}
          </div>
        )}
      </div>

      {step > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex flex-col gap-2 shrink-0">
          {step === 4 && (
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canProceed() || isSubmitting}
              className="w-full px-5 py-3 site-btn text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Booking…" : "Next"}
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
