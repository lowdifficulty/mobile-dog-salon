"use client";

import { useEffect, useRef, useState } from "react";
import { PET_SIZES } from "@/lib/constants";
import { GROOMING_SERVICES } from "@/lib/pricing";
import type { GroomerClientRecord } from "@/lib/groomer/active-clients";

export interface GroomerClientFormValues {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  service: string;
  address: string;
  city: string;
  zipCode: string;
  pets: { petName: string; petSize: string }[];
}

export function clientToFormValues(client: GroomerClientRecord): GroomerClientFormValues {
  const pets =
    client.pets.length > 0
      ? client.pets.map((pet) => ({
          petName: pet.petName ?? "",
          petSize: pet.petSize ?? "medium",
        }))
      : [{ petName: "", petSize: "medium" }];

  return {
    phone: client.phone ?? "",
    firstName: client.firstName ?? "",
    lastName: client.lastName ?? "",
    email: client.email ?? "",
    service: client.service ?? "full-groom",
    address: client.address ?? "",
    city: client.city ?? "",
    zipCode: client.zipCode ?? "",
    pets,
  };
}

export default function GroomerClientEditor({
  client,
  busy,
  onSave,
  onCancel,
  onPhotoUploaded,
  onPhotoDeleted,
}: {
  client: GroomerClientRecord;
  busy?: boolean;
  onSave: (values: GroomerClientFormValues) => Promise<void>;
  onCancel: () => void;
  onPhotoUploaded: () => Promise<void>;
  onPhotoDeleted: () => Promise<void>;
}) {
  const [values, setValues] = useState<GroomerClientFormValues>(() =>
    clientToFormValues(client)
  );
  const [photoPetName, setPhotoPetName] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValues(clientToFormValues(client));
  }, [client]);

  function updatePet(index: number, field: "petName" | "petSize", value: string) {
    setValues((prev) => ({
      ...prev,
      pets: prev.pets.map((pet, i) =>
        i === index ? { ...pet, [field]: value } : pet
      ),
    }));
  }

  function addPet() {
    setValues((prev) => ({
      ...prev,
      pets: [...prev.pets, { petName: "", petSize: "medium" }],
    }));
  }

  function removePet(index: number) {
    setValues((prev) => ({
      ...prev,
      pets: prev.pets.filter((_, i) => i !== index),
    }));
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const form = new FormData();
      form.set("appointmentId", client.anchorAppointmentId);
      form.set("file", file);
      if (photoPetName.trim()) form.set("petName", photoPetName.trim());
      if (photoCaption.trim()) form.set("caption", photoCaption.trim());

      const res = await fetch("/api/groomer/clients/photos", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Upload failed");
      }
      setPhotoPetName("");
      setPhotoCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await onPhotoUploaded();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function deletePhoto(photoId: string) {
    if (!window.confirm("Remove this photo?")) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const res = await fetch(`/api/groomer/clients/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await onPhotoDeleted();
    } catch {
      setPhotoError("Could not remove photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-lg border border-brand/20 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Edit client
      </p>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave(values);
        }}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              First name
            </label>
            <input
              value={values.firstName}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, firstName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Last name
            </label>
            <input
              value={values.lastName}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, lastName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={values.phone}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Email
            </label>
            <input
              type="email"
              value={values.email}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Service
            </label>
            <select
              value={values.service}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, service: e.target.value }))
              }
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
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Street address
            </label>
            <input
              value={values.address}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, address: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              City
            </label>
            <input
              value={values.city}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, city: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              ZIP code
            </label>
            <input
              value={values.zipCode}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, zipCode: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Pets
            </p>
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
              <li
                key={index}
                className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Pet name
                  </label>
                  <input
                    value={pet.petName}
                    onChange={(e) => updatePet(index, "petName", e.target.value)}
                    placeholder="e.g. Bella"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Size
                  </label>
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

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save client"}
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

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Pet photos
        </p>
        {client.photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {client.photos.map((photo) => (
              <div
                key={photo.id}
                className="relative rounded-lg border border-gray-100 bg-gray-50 overflow-hidden"
              >
                <img
                  src={photo.url}
                  alt={photo.petName ?? photo.caption ?? "Pet photo"}
                  className="w-full h-28 object-cover"
                />
                <div className="p-2 text-xs text-gray-600">
                  {photo.petName && <p className="font-semibold">{photo.petName}</p>}
                  {photo.caption && <p>{photo.caption}</p>}
                </div>
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => deletePhoto(photo.id)}
                  className="absolute top-1 right-1 rounded-full bg-black/50 text-white text-[10px] px-2 py-0.5"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            value={photoPetName}
            onChange={(e) => setPhotoPetName(e.target.value)}
            placeholder="Pet name (optional)"
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
          <input
            type="text"
            value={photoCaption}
            onChange={(e) => setPhotoCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="text-sm"
          disabled={photoBusy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadPhoto(file);
          }}
        />
        {photoError && <p className="text-sm text-red-600 mt-1">{photoError}</p>}
      </div>
    </div>
  );
}
