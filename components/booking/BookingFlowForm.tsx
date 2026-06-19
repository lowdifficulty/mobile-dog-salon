"use client";

import { useState } from "react";
import Link from "next/link";
import { PET_SIZES } from "@/lib/constants";
import {
  GROOMING_SERVICES,
  formatPrice,
  getListServicePrice,
  getQuotedServicePrice,
  getServiceLabel,
} from "@/lib/pricing";
import WeekAvailabilityPicker from "@/components/scheduling/WeekAvailabilityPicker";
import AddToCalendarButtons from "@/components/booking/AddToCalendarButtons";
import { legalRoutes } from "@/lib/company-legal";
import type { AvailableSlot } from "@/lib/scheduling/types";
import { formatAppointmentAddress, isValidZipCode } from "@/lib/scheduling/address";
import type { CalendarEventDetails } from "@/lib/calendar-links";
import { saveLead, type SaveLeadPayload } from "@/lib/leads/client";
import type { LeadFunnelStep } from "@/lib/leads/types";
import {
  buildBookingNotes,
  draftToBookingPet,
  formatPetNames,
  formatPetsList,
  getPetSizeLabel,
  type BookingPet,
  type DraftPet,
} from "@/lib/booking/pets";

interface BookingFormData {
  petName: string;
  petSize: string;
  service: string;
  fullName: string;
  email: string;
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
  petName: "",
  petSize: "",
  service: "",
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  zipCode: "",
  preferredDate: "",
  preferredTime: "",
  slotKey: "",
  groomerName: "",
};

const STEP_COUNT = 5;

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
  const [queuedPets, setQueuedPets] = useState<DraftPet[]>([]);
  const [bookingPets, setBookingPets] = useState<BookingPet[]>([]);
  const [discountActive, setDiscountActive] = useState(false);
  const [discountSkipped, setDiscountSkipped] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appointmentId, setAppointmentId] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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

  const phoneRequired = discountSkipped || discountActive;

  const collectDraftPets = (): DraftPet[] => {
    const all = [...queuedPets];
    if (data.petName.trim() && data.petSize) {
      all.push({ name: data.petName.trim(), size: data.petSize });
    }
    return all;
  };

  const getDraftBookingPets = (): BookingPet[] => collectDraftPets().map(draftToBookingPet);

  const persistLead = (funnelStep: LeadFunnelStep, extra?: Partial<SaveLeadPayload>) => {
    const activePets = bookingPets.length ? bookingPets : getDraftBookingPets();
    void saveLead({
      funnelStep,
      phone: data.phone,
      email: data.email,
      fullName: data.fullName,
      petName: activePets[0]?.petName ?? data.petName,
      petSize: activePets[0]?.petSize ?? data.petSize,
      pets: activePets.length ? activePets : undefined,
      service: data.service,
      address: data.address,
      city: data.city,
      zipCode: data.zipCode,
      discountActive,
      discountSkipped,
      smsOptIn: discountActive,
      source: "booking",
      ...extra,
    });
  };

  const advanceStep = () => {
    if (!canProceed()) return;
    if (step === 2) {
      const allPets = collectDraftPets();
      const finalized = allPets.map(draftToBookingPet);
      setBookingPets(finalized);
      setQueuedPets([]);
      setData((prev) => ({
        ...prev,
        petName: allPets[0]?.name ?? "",
        petSize: allPets[0]?.size ?? "",
      }));
      persistLead("pet_info", {
        petName: allPets[0]?.name,
        petSize: allPets[0]?.size,
        pets: finalized,
      });
    }
    if (step === 3) persistLead("package_selected");
    if (step === 4) persistLead("contact_details");
    setStep(step + 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return discountSkipped || data.phone.trim().length >= 10;
      case 2:
        return collectDraftPets().length >= 1;
      case 3:
        return Boolean(data.service && data.petSize);
      case 4:
        return Boolean(
          data.fullName.trim() &&
            data.email.trim() &&
            data.address.trim() &&
            data.city.trim() &&
            isValidZipCode(data.zipCode) &&
            (!phoneRequired || data.phone.trim().length >= 10)
        );
      case 5:
        return Boolean(data.slotKey);
      default:
        return false;
    }
  };

  const handleSkipDiscount = () => {
    setDiscountSkipped(true);
    setDiscountActive(false);
    setData((prev) => ({ ...prev, phone: "" }));
    void saveLead({
      funnelStep: "phone_entered",
      discountSkipped: true,
      source: "booking",
    });
    setStep(2);
  };

  const handleApplyDiscount = () => {
    if (data.phone.trim().length < 10) return;
    setDiscountActive(true);
    setDiscountSkipped(false);
    void saveLead({
      funnelStep: "phone_entered",
      phone: data.phone,
      discountActive: true,
      smsOptIn: true,
      source: "booking",
    });
    setStep(2);
  };

  const handleAddAnotherPet = () => {
    if (!data.petName.trim() || !data.petSize) return;
    setQueuedPets((prev) => [...prev, { name: data.petName.trim(), size: data.petSize }]);
    setData((prev) => ({ ...prev, petName: "", petSize: "" }));
  };

  const handleRemoveQueuedPet = (index: number) => {
    setQueuedPets((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBack = () => {
    if (step === 3 && bookingPets.length > 0) {
      const [primary, ...rest] = bookingPets;
      setQueuedPets(rest.map((pet) => ({ name: pet.petName, size: pet.petSize })));
      setData((prev) => ({
        ...prev,
        petName: primary.petName,
        petSize: primary.petSize,
      }));
      setBookingPets([]);
    }
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    setIsSubmitting(true);
    setSubmitError("");

    const { firstName, lastName } = splitName(data.fullName);

    const finalizedPets =
      bookingPets.length > 0 ? bookingPets : getDraftBookingPets();
    const additionalPets = finalizedPets.slice(1);

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotKey: data.slotKey,
          petName: finalizedPets[0]?.petName ?? data.petName,
          petBreed: "",
          petSize: finalizedPets[0]?.petSize ?? data.petSize,
          additionalPets: additionalPets.length ? additionalPets : undefined,
          service: data.service,
          firstName,
          lastName,
          email: data.email,
          phone: data.phone,
          smsOptIn: discountActive,
          address: data.address,
          city: data.city,
          zipCode: data.zipCode,
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
      void saveLead({
        funnelStep: "scheduled",
        phone: data.phone,
        email: data.email,
        fullName: data.fullName,
        petName: finalizedPets[0]?.petName ?? data.petName,
        petSize: finalizedPets[0]?.petSize ?? data.petSize,
        pets: finalizedPets,
        service: data.service,
        address: data.address,
        city: data.city,
        zipCode: data.zipCode,
        discountActive,
        discountSkipped,
        smsOptIn: discountActive,
        appointmentId: result.appointmentId,
        scheduledAt: new Date().toISOString(),
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
        petName: data.petName,
        petSize: data.petSize,
        service: data.service,
        firstName: splitName(data.fullName).firstName,
        lastName: splitName(data.fullName).lastName,
        phone: data.phone,
        email: data.email,
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
    const bookedPets =
      bookingPets.length > 0 ? bookingPets : getDraftBookingPets();
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
          {discountActive && selectedPrice != null && (
            <p className="text-sm font-semibold text-brand mb-2">
              Your 50% discount is applied — {formatPrice(selectedPrice)} for this visit.
            </p>
          )}
          <p className="text-xs text-gray-500 mb-6">
            You&apos;ll receive a confirmation email shortly.
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
    <div className="flex flex-col">
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
            <div className="rounded-xl border border-accent/20 bg-accent-light px-2.5 py-3 text-center">
              <p className="text-2xl font-bold text-brand leading-tight">
                50% OFF your Next Appointment
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-800 leading-tight">
                Enter your phone number to unlock half off your next groom!
              </p>
            </div>
            <div>
              <label htmlFor="discount-phone" className="block text-xs font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                id="discount-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(714) 555-0123"
                className={inputClass}
              />
            </div>
            <button
              type="button"
              onClick={handleApplyDiscount}
              disabled={data.phone.trim().length < 10}
              className="w-full px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-full hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Unlock 50% Off
            </button>
            <button
              type="button"
              onClick={handleSkipDiscount}
              className="w-full text-xs font-medium text-gray-500 hover:text-gray-800 underline"
            >
              Skip — pay full price
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {queuedPets.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Pets added</p>
                <ul className="space-y-1.5">
                  {queuedPets.map((pet, index) => (
                    <li
                      key={`${pet.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span className="text-gray-800">
                        {pet.name} ({getPetSizeLabel(pet.size)})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQueuedPet(index)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-800"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pet&apos;s Name *</label>
              <input
                type="text"
                value={data.petName}
                onChange={(e) => update("petName", e.target.value)}
                placeholder="e.g. Bella"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Size *</label>
              <div className="grid grid-cols-3 gap-2">
                {PET_SIZES.map((size) => (
                  <button
                    key={size.value}
                    type="button"
                    onClick={() => {
                      update("petSize", size.value);
                      update("service", "");
                      clearSchedule();
                    }}
                    className={`px-2 py-2 rounded-xl border text-xs font-medium transition-all text-center ${
                      data.petSize === size.value
                        ? "border-brand bg-brand/10 text-brand"
                        : "border-gray-200 text-gray-700 hover:border-brand/40"
                    }`}
                  >
                    <span className="block leading-tight">{size.title}</span>
                    <span className="block mt-0.5 leading-tight opacity-80">{size.weight}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {discountActive && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
                50% discount activated!
              </div>
            )}
            {!data.petSize ? (
              <p className="text-xs text-gray-600 rounded-xl bg-gray-50 border border-gray-200 px-3 py-2">
                Go back and select your dog&apos;s size to see pricing.
              </p>
            ) : (
              <div className="space-y-2">
                {GROOMING_SERVICES.map((service) => {
                  const quoted = getQuotedServicePrice(data.petSize, service.value, discountActive);
                  const list = getListServicePrice(data.petSize, service.value);
                  return (
                    <button
                      key={service.value}
                      type="button"
                      onClick={() => {
                        update("service", service.value);
                        clearSchedule();
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        data.service === service.value
                          ? "border-brand bg-brand/5"
                          : "border-gray-200 hover:border-brand/40"
                      }`}
                    >
                      <span className="text-sm font-medium text-gray-900 text-left">{service.label}</span>
                      <span className="text-right shrink-0 ml-3">
                        {discountActive && list != null && quoted != null ? (
                          <span className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-gray-400 line-through">{formatPrice(list)}</span>
                            <span className="text-sm font-bold text-brand">{formatPrice(quoted)}</span>
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-brand">
                            {quoted != null ? formatPrice(quoted) : "—"}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={data.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                className={inputClass}
              />
            </div>
            {discountSkipped && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(714) 555-0123"
                  autoComplete="tel"
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Street Address *</label>
              <input
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
                <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                <input
                  type="text"
                  value={data.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Irvine"
                  autoComplete="address-level2"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ZIP *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={data.zipCode}
                  onChange={(e) => update("zipCode", e.target.value)}
                  placeholder="92618"
                  maxLength={10}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 space-y-0.5">
              <p>
                <span className="text-gray-400">Pets:</span>{" "}
                {formatPetsList(
                  bookingPets.length > 0 ? bookingPets : getDraftBookingPets()
                )}{" "}
                — {getServiceLabel(data.service)}
                {selectedPrice != null && ` (${formatPrice(selectedPrice)})`}
              </p>
              <p>
                <span className="text-gray-400">Where:</span>{" "}
                {formatAppointmentAddress({
                  address: data.address,
                  city: data.city,
                  zipCode: data.zipCode,
                })}
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

          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={handleAddAnotherPet}
                disabled={!data.petName.trim() || !data.petSize}
                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-full hover:text-brand hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Another Pet
              </button>
            )}

            {step < STEP_COUNT ? (
              <button
                type="button"
                onClick={advanceStep}
                disabled={!canProceed()}
                className="px-5 py-2 bg-brand text-white text-sm font-semibold rounded-full hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="px-5 py-2 bg-brand text-white text-sm font-semibold rounded-full hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Booking…" : "Book Appointment"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
