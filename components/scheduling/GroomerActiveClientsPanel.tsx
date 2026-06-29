"use client";

import { useCallback, useEffect, useState } from "react";
import { getPetSizeLabel } from "@/lib/booking/pets";
import { getServiceLabel } from "@/lib/pricing";
import { formatAppointmentAddress } from "@/lib/scheduling/address";
import { formatPhoneDisplay } from "@/lib/leads/normalize";
import type { GroomerClientRecord } from "@/lib/groomer/active-clients";
import type { GroomerId } from "@/lib/scheduling/types";
import GroomerClientEditor, {
  type GroomerClientFormValues,
} from "./GroomerClientEditor";

function formatWhen(startAt: string) {
  return new Date(startAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function formatNoteDate(createdAt: string) {
  return new Date(createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
}

function formatMoneyCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function clientDisplayName(client: GroomerClientRecord) {
  const name = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (client.phone) return formatPhoneDisplay(client.phone);
  return "Client";
}

function petsLabel(client: GroomerClientRecord) {
  if (!client.pets.length) return "Pet details unavailable";
  return client.pets
    .map((pet) => {
      const size = pet.petSize ? getPetSizeLabel(pet.petSize) : "";
      if (pet.petName?.trim() && size) return `${pet.petName} (${size})`;
      if (pet.petName?.trim()) return pet.petName;
      return size || "Pet";
    })
    .join(", ");
}

function formatAddress(client: GroomerClientRecord) {
  const line = formatAppointmentAddress({
    address: client.address,
    city: client.city,
    zipCode: client.zipCode,
  });
  return line.trim() ? line : "—";
}

export default function GroomerActiveClientsPanel({
  groomerId,
}: {
  groomerId: GroomerId;
}) {
  const [clients, setClients] = useState<GroomerClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadClients = useCallback(() => {
    setLoading(true);
    setError("");
    return fetch("/api/groomer/clients")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        const data = (await res.json()) as { clients: GroomerClientRecord[] };
        setClients(data.clients ?? []);
      })
      .catch(() => setError("Could not load active clients."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients, groomerId]);

  async function saveClient(client: GroomerClientRecord, values: GroomerClientFormValues) {
    setSavingKey(client.key);
    setError("");
    try {
      const res = await fetch("/api/groomer/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: client.anchorAppointmentId,
          phone: values.phone,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          service: values.service,
          address: values.address,
          city: values.city,
          zipCode: values.zipCode,
          pets: values.pets.filter((pet) => pet.petName.trim() || pet.petSize),
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed");
      }
      setEditingKey(null);
      await loadClients();
      setExpandedKey(client.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save client.");
    } finally {
      setSavingKey(null);
    }
  }

  async function addNote(client: GroomerClientRecord) {
    const text = noteDrafts[client.key]?.trim();
    if (!text) return;

    setSavingKey(client.key);
    setError("");
    try {
      const res = await fetch("/api/groomer/clients/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: client.anchorAppointmentId,
          text,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setNoteDrafts((prev) => ({ ...prev, [client.key]: "" }));
      await loadClients();
      setExpandedKey(client.key);
    } catch {
      setError("Could not save note.");
    } finally {
      setSavingKey(null);
    }
  }

  if (loading && clients.length === 0) {
    return <p className="text-sm text-gray-500">Loading active clients…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Client details, service history, payments, and dog notes.
        </p>
        <button
          type="button"
          onClick={loadClients}
          className="text-sm font-semibold text-brand hover:text-accent"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {clients.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          No active clients yet. Past and upcoming appointments will appear here.
        </p>
      ) : (
        <ul className="space-y-3">
          {clients.map((client) => {
            const expanded = expandedKey === client.key;
            const editing = editingKey === client.key;
            const busy = savingKey === client.key;

            return (
              <li
                key={client.key}
                className="site-card border border-gray-100 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedKey(expanded ? null : client.key)
                  }
                  className="w-full text-left px-4 py-4 sm:px-5 flex flex-wrap items-start justify-between gap-3 hover:bg-gray-50/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {clientDisplayName(client)}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">{petsLabel(client)}</p>
                    {client.phone && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatPhoneDisplay(client.phone)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 text-sm">
                    {client.nextAppointmentAt && (
                      <p className="font-semibold text-brand">
                        Next: {formatWhen(client.nextAppointmentAt)}
                      </p>
                    )}
                    {client.lastAppointmentAt && (
                      <p className="text-gray-500">
                        Last: {formatWhen(client.lastAppointmentAt)}
                      </p>
                    )}
                    {client.totalQuotedCents > 0 && (
                      <p className="text-gray-700 font-medium">
                        Booked: {formatMoneyCents(client.totalQuotedCents)}
                      </p>
                    )}
                    {client.totalPaidCents > 0 && (
                      <p className="text-green-700 font-medium">
                        Paid: {formatMoneyCents(client.totalPaidCents)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {client.appointments.length} visit
                      {client.appointments.length === 1 ? "" : "s"}
                      {client.notes.length > 0 && ` · ${client.notes.length} note(s)`}
                    </p>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-gray-100 px-4 py-4 sm:px-5 space-y-5 bg-gray-50/50">
                    {editing ? (
                      <GroomerClientEditor
                        client={client}
                        busy={busy}
                        onSave={(values) => saveClient(client, values)}
                        onCancel={() => setEditingKey(null)}
                        onPhotoUploaded={loadClients}
                        onPhotoDeleted={loadClients}
                      />
                    ) : (
                      <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Client information
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditingKey(client.key)}
                        className="text-sm font-semibold text-brand hover:text-accent"
                      >
                        Edit client & photos
                      </button>
                    </div>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm rounded-lg border border-gray-100 bg-white px-4 py-3">
                        <p>
                          <span className="text-gray-400">Name:</span>{" "}
                          {clientDisplayName(client)}
                        </p>
                        <p>
                          <span className="text-gray-400">Phone:</span>{" "}
                          {client.phone
                            ? formatPhoneDisplay(client.phone)
                            : "—"}
                        </p>
                        <p>
                          <span className="text-gray-400">Email:</span>{" "}
                          {client.email || "—"}
                        </p>
                        <p>
                          <span className="text-gray-400">Service:</span>{" "}
                          {client.service
                            ? getServiceLabel(client.service)
                            : "—"}
                        </p>
                        <p className="sm:col-span-2">
                          <span className="text-gray-400">Address:</span>{" "}
                          {formatAddress(client)}
                        </p>
                        <p>
                          <span className="text-gray-400">Pets:</span>{" "}
                          {petsLabel(client)}
                        </p>
                        {client.discountActive && (
                          <p>
                            <span className="text-gray-400">Discount:</span>{" "}
                            50% phone offer
                          </p>
                        )}
                        {client.totalQuotedCents > 0 && (
                          <p>
                            <span className="text-gray-400">Total booked:</span>{" "}
                            {formatMoneyCents(client.totalQuotedCents)}
                          </p>
                        )}
                        {client.totalPaidCents > 0 && (
                          <p>
                            <span className="text-gray-400">Total paid:</span>{" "}
                            {formatMoneyCents(client.totalPaidCents)}
                          </p>
                        )}
                      </div>

                    {client.photos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                          Pet photos
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {client.photos.map((photo) => (
                            <div
                              key={photo.id}
                              className="rounded-lg border border-gray-100 bg-white overflow-hidden"
                            >
                              <img
                                src={photo.url}
                                alt={photo.petName ?? photo.caption ?? "Pet photo"}
                                className="w-full h-28 object-cover"
                              />
                              <div className="p-2 text-xs text-gray-600">
                                {photo.petName && (
                                  <p className="font-semibold">{photo.petName}</p>
                                )}
                                {photo.caption && <p>{photo.caption}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Service history
                      </p>
                      <ul className="space-y-2">
                        {client.appointments.map((ap) => (
                          <li
                            key={ap.id}
                            className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm space-y-1"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-gray-900">
                                {formatWhen(ap.startAt)}
                              </span>
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  ap.isUpcoming
                                    ? "bg-brand/10 text-brand"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {ap.isUpcoming ? "Scheduled" : "Past"}
                              </span>
                            </div>
                            <p className="text-gray-600">
                              {getServiceLabel(ap.service)}
                              {ap.petName?.trim() ? ` · ${ap.petName}` : ""}
                              {ap.petSize
                                ? ` (${getPetSizeLabel(ap.petSize)})`
                                : ""}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-700">
                              {ap.quotedPriceCents != null && (
                                <span>
                                  Booked:{" "}
                                  {formatMoneyCents(ap.quotedPriceCents)}
                                </span>
                              )}
                              {ap.paidAmountCents != null ? (
                                <span className="text-green-700 font-medium">
                                  Paid: {formatMoneyCents(ap.paidAmountCents)}
                                </span>
                              ) : (
                                !ap.isUpcoming &&
                                ap.quotedPriceCents != null && (
                                  <span className="text-gray-400">
                                    Paid: not recorded
                                  </span>
                                )
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {client.payments.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                          Card payments
                        </p>
                        <ul className="space-y-2">
                          {client.payments.map((payment) => (
                            <li
                              key={payment.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
                            >
                              <span className="text-gray-900">
                                {formatWhen(payment.createdAt)}
                              </span>
                              <span className="font-semibold text-green-700">
                                {formatMoneyCents(payment.amountCents)}
                              </span>
                              {payment.note && (
                                <span className="text-gray-500 text-xs w-full">
                                  {payment.note}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Dog notes
                      </p>
                      {client.notes.length === 0 ? (
                        <p className="text-sm text-gray-500 mb-2">No notes yet.</p>
                      ) : (
                        <ul className="space-y-2 mb-3">
                          {client.notes.map((note) => (
                            <li
                              key={note.id}
                              className="text-sm bg-white border border-gray-100 rounded-lg px-3 py-2"
                            >
                              <p>{note.text}</p>
                              <p className="text-[11px] text-gray-400 mt-1">
                                {formatNoteDate(note.createdAt)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={noteDrafts[client.key] ?? ""}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({
                              ...prev,
                              [client.key]: e.target.value,
                            }))
                          }
                          placeholder="e.g. Sensitive paws, hates nail trim"
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => addNote(client)}
                          className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand text-white hover:bg-brand/90 disabled:opacity-50"
                        >
                          Add note
                        </button>
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
