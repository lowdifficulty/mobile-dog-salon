"use client";

import { useEffect, useRef, useState } from "react";
import type { Appointment, AppointmentPaidVia } from "@/lib/scheduling/types";
import type { ClientPhotoKind } from "@/lib/leads/types";

type PhotoWithMeta = {
  id: string;
  url: string;
  petName?: string;
  caption?: string;
  kind?: ClientPhotoKind;
};

const PAID_VIA_OPTIONS: { value: AppointmentPaidVia; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "venmo", label: "Venmo" },
  { value: "zelle", label: "Zelle" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" },
];

export default function GroomerVisitCloseoutForm({
  appointment,
  apiBase,
  busy,
  onSaved,
  onCancel,
}: {
  appointment: Appointment;
  apiBase: string;
  busy?: boolean;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<"complete" | "cancelled">(
    appointment.visitCloseStatus ?? "complete"
  );
  const [firstName, setFirstName] = useState(appointment.firstName ?? "");
  const [lastName, setLastName] = useState(appointment.lastName ?? "");
  const [petName, setPetName] = useState(appointment.petName ?? "");
  const [groomNotes, setGroomNotes] = useState(appointment.groomNotes ?? "");
  const [paidAmountDollars, setPaidAmountDollars] = useState(
    appointment.paidAmountCents != null
      ? String(appointment.paidAmountCents / 100)
      : ""
  );
  const [paidVia, setPaidVia] = useState<AppointmentPaidVia>(
    appointment.paidVia ?? "cash"
  );
  const [photos, setPhotos] = useState<PhotoWithMeta[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${apiBase}/${appointment.id}/closeout`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load visit");
        if (cancelled) return;
        const ap = data.appointment as Appointment;
        setOutcome(ap.visitCloseStatus ?? "complete");
        setFirstName(ap.firstName ?? "");
        setLastName(ap.lastName ?? "");
        setPetName(ap.petName ?? "");
        setGroomNotes(ap.groomNotes ?? "");
        setPaidAmountDollars(
          ap.paidAmountCents != null ? String(ap.paidAmountCents / 100) : ""
        );
        setPaidVia(ap.paidVia ?? "cash");
        setPhotos(data.photos ?? []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load visit");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, appointment.id]);

  async function uploadPhotos(files: FileList | null, kind: ClientPhotoKind) {
    if (!files?.length) return;
    setPhotoBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("appointmentId", appointment.id);
        form.set("file", file);
        form.set("kind", kind);
        if (petName.trim()) form.set("petName", petName.trim());

        const res = await fetch("/api/groomer/clients/photos", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Photo upload failed");
        setPhotos((prev) => [
          { ...data.photo, url: data.photo.url, kind },
          ...prev,
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed");
    } finally {
      setPhotoBusy(false);
      if (kind === "before" && beforeInputRef.current) {
        beforeInputRef.current.value = "";
      }
      if (kind === "after" && afterInputRef.current) {
        afterInputRef.current.value = "";
      }
    }
  }

  async function deletePhoto(photoId: string) {
    if (!window.confirm("Remove this photo?")) return;
    setPhotoBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/groomer/clients/photos/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not remove photo");
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      setError("Could not remove photo");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch(`${apiBase}/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "closeout",
          outcome,
          firstName,
          lastName,
          petName,
          groomNotes,
          paidAmountDollars: paidAmountDollars.trim() || undefined,
          paidVia: outcome === "complete" ? paidVia : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save visit");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save visit");
    }
  }

  const beforePhotos = photos.filter((p) => p.kind === "before");
  const afterPhotos = photos.filter((p) => p.kind === "after");
  const isDisabled = busy || photoBusy;

  if (loading) {
    return <p className="text-sm text-gray-500">Loading appointment closeout…</p>;
  }

  return (
    <form className="space-y-4 rounded-lg border border-brand/20 bg-white p-4" onSubmit={handleSubmit}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Close appointment
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-gray-600 mb-1">Appointment outcome</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="outcome"
              value="complete"
              checked={outcome === "complete"}
              onChange={() => setOutcome("complete")}
              disabled={isDisabled}
            />
            Appointment complete
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="outcome"
              value="cancelled"
              checked={outcome === "cancelled"}
              onChange={() => setOutcome("cancelled")}
              disabled={isDisabled}
            />
            Appointment cancelled
          </label>
        </div>
      </fieldset>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Owner first name</label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isDisabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Owner last name</label>
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={isDisabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Dog name</label>
          <input
            value={petName}
            onChange={(e) => setPetName(e.target.value)}
            disabled={isDisabled}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Notes for the dog</label>
        <textarea
          value={groomNotes}
          onChange={(e) => setGroomNotes(e.target.value)}
          rows={3}
          disabled={isDisabled}
          placeholder="Coat condition, behavior, styling notes…"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
        />
      </div>

      {outcome === "complete" && (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Amount paid ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paidAmountDollars}
              onChange={(e) => setPaidAmountDollars(e.target.value)}
              disabled={isDisabled}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Payment method</label>
            <select
              value={paidVia}
              onChange={(e) => setPaidVia(e.target.value as AppointmentPaidVia)}
              disabled={isDisabled}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            >
              {PAID_VIA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <PhotoSection
          title="Before photos"
          photos={beforePhotos}
          inputRef={beforeInputRef}
          disabled={isDisabled}
          onUpload={(files) => uploadPhotos(files, "before")}
          onDelete={deletePhoto}
        />
        <PhotoSection
          title="After photos"
          photos={afterPhotos}
          inputRef={afterInputRef}
          disabled={isDisabled}
          onUpload={(files) => uploadPhotos(files, "after")}
          onDelete={deletePhoto}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={isDisabled}
          className="px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark disabled:opacity-50"
        >
          {busy ? "Saving…" : appointment.visitClosedAt ? "Update appointment" : "Save appointment"}
        </button>
        <button
          type="button"
          disabled={isDisabled}
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function PhotoSection({
  title,
  photos,
  inputRef,
  disabled,
  onUpload,
  onDelete,
}: {
  title: string;
  photos: PhotoWithMeta[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  onUpload: (files: FileList | null) => void;
  onDelete: (photoId: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</p>
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative rounded-lg border border-gray-100 bg-gray-50 overflow-hidden"
            >
              <img
                src={photo.url}
                alt={photo.petName ?? title}
                className="w-full h-24 object-cover"
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDelete(photo.id)}
                className="absolute top-1 right-1 rounded-full bg-black/50 text-white text-[10px] px-2 py-0.5"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={disabled}
        className="text-sm"
        onChange={(e) => onUpload(e.target.files)}
      />
    </div>
  );
}
