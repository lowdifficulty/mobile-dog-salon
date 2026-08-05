"use client";

import { useEffect, useMemo, useState } from "react";
import { PET_SIZES } from "@/lib/constants";
import { GROOMING_SERVICES } from "@/lib/pricing";
import {
  type BookingPet,
  buildBookingNotes,
  formatPetsList,
} from "@/lib/booking/pets";
import StaffDateTimePicker, { buildSlotKey } from "@/components/scheduling/StaffDateTimePicker";
import {
  listRecurringStaffDates,
  STAFF_RECURRENCE_OPTIONS,
  type StaffRecurrenceFrequency,
} from "@/lib/scheduling/recurring-appointments";
import { bookingDurationMinutesForGroomer } from "@/lib/scheduling/groomers";
import { formatDurationLabel } from "@/lib/scheduling/services";
import type { GroomerId } from "@/lib/scheduling/types";

export interface StaffBookAppointmentPrefill {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  petName?: string;
  petBreed?: string;
  petSize?: string;
  additionalPets?: BookingPet[];
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  notes?: string;
}

function emptyPet(size = "medium"): BookingPet {
  return { petName: "", petSize: size };
}

export default function StaffBookAppointmentForm({
  defaultGroomerId,
  allowGroomerPick = false,
  defaultOpen = false,
  prefill,
  onBooked,
}: {
  defaultGroomerId: GroomerId;
  allowGroomerPick?: boolean;
  defaultOpen?: boolean;
  prefill?: StaffBookAppointmentPrefill;
  onBooked?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [groomerId, setGroomerId] = useState<GroomerId>(defaultGroomerId);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [firstName, setFirstName] = useState(prefill?.firstName ?? "");
  const [lastName, setLastName] = useState(prefill?.lastName ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [petBreed, setPetBreed] = useState(prefill?.petBreed ?? "");
  const [pets, setPets] = useState<BookingPet[]>(() => {
    const size = prefill?.petSize ?? "medium";
    const list: BookingPet[] = [
      { petName: prefill?.petName ?? "", petSize: size },
      ...(prefill?.additionalPets ?? []),
    ];
    return list.length ? list : [emptyPet(size)];
  });
  const [service, setService] = useState(prefill?.service ?? "full-groom");
  const [address, setAddress] = useState(prefill?.address ?? "");
  const [city, setCity] = useState(prefill?.city ?? "");
  const [zipCode, setZipCode] = useState(prefill?.zipCode ?? "");
  const [notes, setNotes] = useState(prefill?.notes ?? "");
  const [recurrence, setRecurrence] = useState<StaffRecurrenceFrequency>("none");
  const [durationMinutes, setDurationMinutes] = useState(() =>
    bookingDurationMinutesForGroomer(defaultGroomerId)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const multiDog = pets.length > 1;
  const blockMinutes = bookingDurationMinutesForGroomer(groomerId);

  useEffect(() => {
    if (multiDog) {
      setDurationMinutes((prev) => {
        const suggested = Math.min(480, blockMinutes * pets.length);
        return prev < blockMinutes ? suggested : prev;
      });
      if (recurrence !== "none") setRecurrence("none");
    } else {
      setDurationMinutes(blockMinutes);
    }
  }, [multiDog, pets.length, blockMinutes, recurrence]);

  useEffect(() => {
    setDurationMinutes(bookingDurationMinutesForGroomer(groomerId));
    setTime("");
  }, [groomerId]);

  const plannedDates = useMemo(() => {
    if (!date || recurrence === "none" || multiDog) return date ? [date] : [];
    return listRecurringStaffDates(date, recurrence);
  }, [date, recurrence, multiDog]);

  function resetForm() {
    setDate("");
    setTime("");
    setRecurrence("none");
    setError(null);
    setSuccess(null);
  }

  function updatePet(index: number, patch: Partial<BookingPet>) {
    setPets((prev) =>
      prev.map((pet, i) => (i === index ? { ...pet, ...patch } : pet))
    );
  }

  function addDog() {
    const size = pets[0]?.petSize ?? "medium";
    setPets((prev) => [...prev, emptyPet(size)]);
    setTime("");
  }

  function removeDog(index: number) {
    if (pets.length <= 1) return;
    setPets((prev) => prev.filter((_, i) => i !== index));
    setTime("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !time) {
      setError("Pick a date and time first.");
      return;
    }
    if (multiDog && (durationMinutes < 60 || durationMinutes > 480)) {
      setError("Visit length must be between 1 and 8 hours.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);

    const primary = pets[0];
    const additionalPets = pets.slice(1);
    const petNotes = buildBookingNotes(false, additionalPets);
    const combinedNotes = [notes.trim(), petNotes].filter(Boolean).join("\n");

    try {
      const res = await fetch("/api/staff/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotKey: buildSlotKey(groomerId, date, time),
          firstName,
          lastName,
          phone,
          email,
          petName: primary.petName,
          petBreed,
          petSize: primary.petSize,
          additionalPets: additionalPets.length ? additionalPets : undefined,
          service,
          address,
          city,
          zipCode,
          notes: combinedNotes || undefined,
          recurrence: multiDog ? "none" : recurrence,
          durationMinutes: multiDog ? durationMinutes : undefined,
          overrideAvailability: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking failed");

      const bookedCount = data.bookedCount ?? 1;
      const skipped = (data.skipped ?? []) as { date: string; reason: string }[];
      if (skipped.length > 0) {
        setSuccess(
          `Booked ${bookedCount} appointment${bookedCount === 1 ? "" : "s"}. Skipped ${skipped.length} date${skipped.length === 1 ? "" : "s"} (conflicts).`
        );
      } else if (bookedCount > 1) {
        setSuccess(`Booked ${bookedCount} recurring appointments.`);
      } else {
        setSuccess("Appointment booked.");
      }
      setDate("");
      setTime("");
      setRecurrence("none");
      onBooked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 px-5 py-2.5 rounded-full text-sm font-semibold bg-brand text-white hover:bg-brand-dark"
      >
        + Book appointment
      </button>
    );
  }

  return (
    <div className="site-card p-5 mb-6 border border-accent/30">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-brand">Book appointment</h2>
          <p className="text-sm text-gray-600">
            Re-book a client on any future date, even if you haven&apos;t set availability yet.
            Add multiple dogs to set a custom visit length and hourly start time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Close
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-4">
          {success}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold text-gray-700">Dogs</label>
            <button
              type="button"
              onClick={addDog}
              className="text-sm font-semibold text-brand hover:underline"
            >
              + Add dog
            </button>
          </div>
          {pets.map((pet, index) => (
            <div
              key={index}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/80"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Dog {index + 1} name
                </label>
                <input
                  value={pet.petName}
                  onChange={(e) => updatePet(index, { petName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Size</label>
                <select
                  required
                  value={pet.petSize}
                  onChange={(e) => updatePet(index, { petSize: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {PET_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>
              {pets.length > 1 ? (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeDog(index)}
                    className="text-sm font-semibold text-red-600 hover:underline px-2 py-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>
          ))}
        </div>

        {multiDog && (
          <div className="max-w-md">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Visit length (hours)
            </label>
            <input
              type="number"
              min={1}
              max={8}
              step={0.5}
              required
              value={durationMinutes / 60}
              onChange={(e) => {
                const hours = parseFloat(e.target.value);
                if (Number.isFinite(hours)) {
                  setDurationMinutes(Math.round(hours * 60));
                  setTime("");
                }
              }}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {formatDurationLabel(durationMinutes)} total for {pets.length} dogs — pick an hourly
              start time below.
            </p>
          </div>
        )}

        <StaffDateTimePicker
          groomerId={groomerId}
          selectedDate={date}
          selectedTime={time}
          onSelectDate={(value) => {
            setDate(value);
            setTime("");
          }}
          onSelectTime={setTime}
          allowGroomerPick={allowGroomerPick}
          onSelectGroomer={setGroomerId}
          visitDurationMinutes={durationMinutes}
          flexibleStartTimes={multiDog}
        />

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Repeat</label>
          <select
            value={recurrence}
            disabled={multiDog}
            onChange={(e) => setRecurrence(e.target.value as StaffRecurrenceFrequency)}
            className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-50"
          >
            {STAFF_RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {multiDog && (
            <p className="mt-1 text-xs text-gray-500">
              Repeat schedules are only available for single-dog bookings.
            </p>
          )}
          {date && recurrence !== "none" && !multiDog && (
            <p className="mt-2 text-sm text-gray-600">
              Will book <span className="font-semibold text-brand">{plannedDates.length}</span>{" "}
              appointment{plannedDates.length === 1 ? "" : "s"} through the next 3 months
              {time ? ` at the same time` : ""}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">First name</label>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Last name</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          {pets.length === 1 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Breed</label>
                <input
                  value={petBreed}
                  onChange={(e) => setPetBreed(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Service</label>
            <select
              required
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            >
              {GROOMING_SERVICES.map((svc) => (
                <option key={svc.value} value={svc.value}>
                  {svc.label}
                </option>
              ))}
            </select>
          </div>
          {multiDog && (
            <div className="sm:col-span-2 text-sm text-gray-600">
              Pets: {formatPetsList(pets)}
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Street address</label>
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ZIP code</label>
            <input
              required
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy || !date || !time}
          className="px-5 py-2.5 rounded-full text-sm font-semibold bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {busy
            ? "Booking…"
            : recurrence !== "none" && plannedDates.length > 1 && !multiDog
              ? `Book ${plannedDates.length} appointments`
              : "Confirm appointment"}
        </button>
      </form>
    </div>
  );
}
