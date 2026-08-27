"use client";

import { useEffect, useState } from "react";
import { PET_SIZES } from "@/lib/constants";
import { GROOMING_SERVICES } from "@/lib/pricing";

export interface CrmContactFormValues {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  service: string;
  address: string;
  city: string;
  zipCode: string;
  pets: { petName: string; petSize: string; petBreed: string }[];
}

export function contactToFormValues(contact: {
  phone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  service?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  pets?: { petName: string; petSize?: string; petBreed?: string }[];
}): CrmContactFormValues {
  const pets =
    contact.pets && contact.pets.length > 0
      ? contact.pets.map((pet) => ({
          petName: pet.petName ?? "",
          petSize: pet.petSize ?? "medium",
          petBreed: pet.petBreed ?? "",
        }))
      : [{ petName: "", petSize: "medium", petBreed: "" }];

  return {
    phone: contact.phone ?? "",
    firstName: contact.firstName ?? "",
    lastName: contact.lastName ?? "",
    email: contact.email ?? "",
    service: contact.service ?? "full-groom",
    address: contact.address ?? "",
    city: contact.city ?? "",
    zipCode: contact.zipCode ?? "",
    pets,
  };
}

export default function CrmContactEditor({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: CrmContactFormValues;
  busy?: boolean;
  onSave: (values: CrmContactFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<CrmContactFormValues>(initial);

  useEffect(() => {
    setValues(initial);
  }, [initial]);

  function updatePet(index: number, field: "petName" | "petSize" | "petBreed", value: string) {
    setValues((prev) => ({
      ...prev,
      pets: prev.pets.map((pet, i) => (i === index ? { ...pet, [field]: value } : pet)),
    }));
  }

  function addPet() {
    setValues((prev) => ({
      ...prev,
      pets: [...prev.pets, { petName: "", petSize: "medium", petBreed: "" }],
    }));
  }

  function removePet(index: number) {
    setValues((prev) => ({
      ...prev,
      pets: prev.pets.filter((_, i) => i !== index),
    }));
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(values);
      }}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">First name</label>
          <input
            value={values.firstName}
            onChange={(e) => setValues((prev) => ({ ...prev, firstName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Last name</label>
          <input
            value={values.lastName}
            onChange={(e) => setValues((prev) => ({ ...prev, lastName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
          <input
            type="tel"
            value={values.phone}
            onChange={(e) => setValues((prev) => ({ ...prev, phone: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
          <input
            type="email"
            value={values.email}
            onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Service</label>
          <select
            value={values.service}
            onChange={(e) => setValues((prev) => ({ ...prev, service: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
          >
            {GROOMING_SERVICES.map((svc) => (
              <option key={svc.value} value={svc.value}>
                {svc.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Street address</label>
          <input
            value={values.address}
            onChange={(e) => setValues((prev) => ({ ...prev, address: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
          <input
            value={values.city}
            onChange={(e) => setValues((prev) => ({ ...prev, city: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">ZIP code</label>
          <input
            value={values.zipCode}
            onChange={(e) => setValues((prev) => ({ ...prev, zipCode: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pets</p>
          <button
            type="button"
            onClick={addPet}
            className="text-xs font-semibold text-brand hover:text-accent"
          >
            + Add pet
          </button>
        </div>
        <ul className="space-y-2">
          {values.pets.map((pet, index) => (
            <li key={index} className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Pet name</label>
                <input
                  value={pet.petName}
                  onChange={(e) => updatePet(index, "petName", e.target.value)}
                  placeholder="e.g. Bella"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Size</label>
                <select
                  value={pet.petSize}
                  onChange={(e) => updatePet(index, "petSize", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                >
                  {PET_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Breed</label>
                <input
                  value={pet.petBreed}
                  onChange={(e) => updatePet(index, "petBreed", e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              {values.pets.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePet(index)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-2"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save contact"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
