"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ClientPortalShell from "@/components/payments/ClientPortalShell";
import SquareCardField from "@/components/payments/SquareCardField";
import WeekAvailabilityPicker from "@/components/scheduling/WeekAvailabilityPicker";
import { PET_SIZES } from "@/lib/constants";
import { formatPrice } from "@/lib/pricing";
import type { AvailableSlot } from "@/lib/scheduling/types";
import type {
  ClientSessionUser,
  ClientPetProfile,
  PaymentHistoryItem,
  SavedCardSummary,
} from "@/lib/payments/types";

type HubTab = "appointments" | "dog" | "payments";
type PayTab = "pay" | "cards" | "history";

interface PortalAppointment {
  id: string;
  startAt: string;
  groomerId: string;
  service: string;
  petName: string;
  petSize: string;
  status: string;
  address: string;
  city: string;
  zipCode: string;
  isUpcoming: boolean;
  quotedPrice: number | null;
}

interface PortalPhoto {
  id: string;
  url: string;
  petName?: string;
  caption?: string;
  createdAt: string;
}

type SquareCardInstance = {
  tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatApptDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClientHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcomeParam = searchParams.get("welcome") === "1";

  const [client, setClient] = useState<ClientSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hubTab, setHubTab] = useState<HubTab>("appointments");

  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [apptBusy, setApptBusy] = useState<string | null>(null);
  const [apptError, setApptError] = useState("");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rebookOpen, setRebookOpen] = useState(false);
  const [pickerService, setPickerService] = useState("full-groom");
  const [pickerDate, setPickerDate] = useState("");
  const [pickerSlotKey, setPickerSlotKey] = useState("");

  const [pets, setPets] = useState<ClientPetProfile[]>([{ petName: "", petSize: "" }]);
  const [dogNotes, setDogNotes] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceCity, setServiceCity] = useState("");
  const [serviceZip, setServiceZip] = useState("");
  const [photos, setPhotos] = useState<PortalPhoto[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPetName, setPhotoPetName] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);

  const [showLickyWelcome, setShowLickyWelcome] = useState(false);

  const [payTab, setPayTab] = useState<PayTab>("pay");
  const [cards, setCards] = useState<SavedCardSummary[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [squareConfigured, setSquareConfigured] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [useNewCard, setUseNewCard] = useState(false);
  const [payCard, setPayCard] = useState<SquareCardInstance | null>(null);
  const [vaultCard, setVaultCard] = useState<SquareCardInstance | null>(null);
  const [payMsg, setPayMsg] = useState("");
  const [payError, setPayError] = useState("");
  const [payBusy, setPayBusy] = useState(false);

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/client/session");
    const data = await res.json();
    if (!data.client) {
      router.replace("/client/login");
      return;
    }
    setClient(data.client);
    setShowLickyWelcome(
      welcomeParam || Boolean(data.client.pendingLickyWelcome)
    );
    setLoading(false);
  }, [router, welcomeParam]);

  useEffect(() => {
    if (showLickyWelcome) {
      window.dispatchEvent(new CustomEvent("licky-welcome"));
    }
  }, [showLickyWelcome]);

  const loadAppointments = useCallback(async () => {
    const res = await fetch("/api/client/appointments");
    if (res.ok) {
      const data = await res.json();
      setAppointments(data.appointments ?? []);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/client/profile");
    if (res.ok) {
      const data = await res.json();
      const profilePets = data.profile?.petProfile?.pets;
      if (profilePets?.length) {
        setPets(profilePets);
      }
      setDogNotes(data.profile?.petProfile?.notes ?? "");
      setServiceAddress(data.profile?.serviceAddress?.address ?? "");
      setServiceCity(data.profile?.serviceAddress?.city ?? "");
      setServiceZip(data.profile?.serviceAddress?.zipCode ?? "");
      if (data.client) setClient(data.client);
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    const res = await fetch("/api/client/photos");
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.photos ?? []);
    }
  }, []);

  const loadCards = useCallback(async () => {
    const res = await fetch("/api/payments/cards");
    if (res.ok) {
      const data = await res.json();
      setCards(data.cards ?? []);
      if (data.cards?.length && !selectedCardId) {
        setSelectedCardId(data.cards[0].id);
      }
    }
  }, [selectedCardId]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/payments/history");
    if (res.ok) {
      const data = await res.json();
      setPayments(data.payments ?? []);
    }
  }, []);

  useEffect(() => {
    loadSession();
    fetch("/api/payments/config")
      .then((r) => r.json())
      .then((c) => setSquareConfigured(c.configured));
  }, [loadSession]);

  useEffect(() => {
    if (!client) return;
    loadAppointments();
    loadProfile();
    loadPhotos();
    loadCards();
    loadHistory();
  }, [client, loadAppointments, loadProfile, loadPhotos, loadCards, loadHistory]);

  async function logout() {
    await fetch("/api/client/logout", { method: "POST" });
    router.push("/client/login");
    router.refresh();
  }

  async function clearLickyWelcome() {
    setShowLickyWelcome(false);
    await fetch("/api/client/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearLickyWelcome: true }),
    });
    setClient((c) => (c ? { ...c, pendingLickyWelcome: false } : c));
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    setApptBusy(id);
    setApptError("");
    const res = await fetch(`/api/client/appointments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    setApptBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setApptError(data.error ?? "Could not cancel");
      return;
    }
    await loadAppointments();
  }

  async function handleReschedule(id: string) {
    if (!pickerSlotKey) return;
    setApptBusy(id);
    setApptError("");
    const res = await fetch(`/api/client/appointments/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reschedule", slotKey: pickerSlotKey }),
    });
    setApptBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setApptError(data.error ?? "Could not reschedule");
      return;
    }
    setRescheduleId(null);
    setPickerSlotKey("");
    await loadAppointments();
  }

  async function handleRebook() {
    if (!pickerSlotKey) return;
    setApptBusy("rebook");
    setApptError("");
    const last = appointments.find((a) => a.isUpcoming) ?? appointments[0];
    const res = await fetch("/api/client/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotKey: pickerSlotKey,
        petSize: pets[0]?.petSize ?? last?.petSize ?? "medium",
        service: pickerService,
        petName: pets[0]?.petName ?? last?.petName,
        address: serviceAddress.trim() || last?.address,
        city: serviceCity.trim() || last?.city,
        zipCode: serviceZip.trim() || last?.zipCode,
      }),
    });
    setApptBusy(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setApptError(data.error ?? "Could not book");
      return;
    }
    setRebookOpen(false);
    setPickerSlotKey("");
    await loadAppointments();
  }

  function selectSlot(slot: AvailableSlot) {
    setPickerSlotKey(slot.slotKey);
    setPickerDate(slot.date);
  }

  async function saveProfile() {
    setProfileBusy(true);
    setProfileError("");
    setProfileMsg("");
    const res = await fetch("/api/client/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        petProfile: {
          pets: pets.filter((p) => p.petName.trim()),
          notes: dogNotes,
        },
        serviceAddress: {
          address: serviceAddress,
          city: serviceCity,
          zipCode: serviceZip,
        },
      }),
    });
    setProfileBusy(false);
    if (!res.ok) {
      setProfileError("Could not save profile");
      return;
    }
    setProfileMsg("Saved!");
  }

  async function uploadPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!photoFile) return;
    setProfileBusy(true);
    setProfileError("");
    const form = new FormData();
    form.append("file", photoFile);
    form.append("petName", photoPetName);
    form.append("caption", photoCaption);
    const res = await fetch("/api/client/photos", { method: "POST", body: form });
    setProfileBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setProfileError(data.error ?? "Upload failed");
      return;
    }
    setPhotoFile(null);
    setPhotoCaption("");
    await loadPhotos();
    setProfileMsg("Photo uploaded!");
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setPayError("");
    setPayMsg("");
    setPayBusy(true);
    try {
      const body: Record<string, string> = { amountDollars: amount, note };
      if (useNewCard || !cards.length) {
        if (!payCard) {
          setPayError("Card form is not ready.");
          setPayBusy(false);
          return;
        }
        const result = await payCard.tokenize();
        if (result.status !== "OK" || !result.token) {
          setPayError(result.errors?.[0]?.message ?? "Could not read card.");
          setPayBusy(false);
          return;
        }
        body.sourceId = result.token;
      } else {
        body.cardId = selectedCardId;
      }
      const res = await fetch("/api/payments/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(data.error ?? "Payment failed");
        setPayBusy(false);
        return;
      }
      setPayMsg(`Payment of ${formatMoney(data.payment.amountCents)} completed.`);
      setAmount("");
      setNote("");
      await loadHistory();
      await loadCards();
    } catch {
      setPayError("Something went wrong.");
    }
    setPayBusy(false);
  }

  async function handleSaveCard() {
    setPayError("");
    setPayMsg("");
    if (!vaultCard) {
      setPayError("Card form is not ready.");
      return;
    }
    setPayBusy(true);
    const result = await vaultCard.tokenize();
    if (result.status !== "OK" || !result.token) {
      setPayError(result.errors?.[0]?.message ?? "Could not read card.");
      setPayBusy(false);
      return;
    }
    const res = await fetch("/api/payments/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: result.token }),
    });
    setPayBusy(false);
    if (!res.ok) {
      setPayError("Could not save card");
      return;
    }
    setPayMsg("Card saved.");
    await loadCards();
  }

  if (loading) {
    return (
      <ClientPortalShell title="Client portal">
        <p className="text-gray-500">Loading…</p>
      </ClientPortalShell>
    );
  }

  if (!client) return null;

  const upcoming = appointments.filter((a) => a.isUpcoming && a.status !== "cancelled");
  const past = appointments.filter((a) => !a.isUpcoming || a.status === "cancelled");

  const hubTabs: { id: HubTab; label: string }[] = [
    { id: "appointments", label: "Appointments" },
    { id: "dog", label: "My dog" },
    { id: "payments", label: "Payments" },
  ];

  return (
    <>
      <ClientPortalShell
        title={`${client.firstName}'s client portal`}
        subtitle="Manage appointments, share photos, pay online, and chat with Licky."
        onLogout={logout}
      >
        {client.lockedInDiscount && (
          <div className="mb-6 rounded-2xl border-2 border-brand/30 bg-gradient-to-r from-brand/10 to-amber-50 px-4 py-3">
            <p className="text-sm font-bold text-brand">50% discount locked in forever</p>
            <p className="text-xs text-gray-600 mt-0.5">
              Your registration perk is active on every grooming visit.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-6">
          {hubTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setHubTab(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                hubTab === t.id
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-brand border-gray-200 hover:border-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {hubTab === "appointments" && (
          <div className="space-y-6">
            {apptError && <p className="text-sm text-red-600">{apptError}</p>}

            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg text-gray-900">Upcoming</h2>
              <button
                type="button"
                onClick={() => {
                  setRebookOpen((v) => !v);
                  setRescheduleId(null);
                  setPickerService(appointments[0]?.service ?? "full-groom");
                }}
                className="text-sm font-semibold text-brand hover:underline"
              >
                {rebookOpen ? "Close rebook" : "Book again"}
              </button>
            </div>

            {rebookOpen && (
              <div className="site-card p-5 space-y-4">
                <p className="font-semibold text-gray-800">Pick a time for your next visit</p>
                <WeekAvailabilityPicker
                  service={pickerService}
                  selectedDate={pickerDate}
                  selectedSlotKey={pickerSlotKey}
                  onSelectDate={(d) => {
                    setPickerDate(d);
                    setPickerSlotKey("");
                  }}
                  onSelectSlot={selectSlot}
                />
                <button
                  type="button"
                  disabled={!pickerSlotKey || apptBusy === "rebook"}
                  onClick={() => void handleRebook()}
                  className="site-btn"
                >
                  {apptBusy === "rebook" ? "Booking…" : "Confirm booking"}
                </button>
              </div>
            )}

            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming appointments.</p>
            ) : (
              upcoming.map((ap) => (
                <div key={ap.id} className="site-card p-5 space-y-3">
                  <div>
                    <p className="font-bold text-gray-900">{ap.petName || "Your pet"}</p>
                    <p className="text-sm text-gray-600">{formatApptDate(ap.startAt)}</p>
                    <p className="text-sm text-gray-500 capitalize">
                      {ap.service.replace(/-/g, " ")} · {ap.status}
                      {ap.quotedPrice != null && ` · ${formatPrice(ap.quotedPrice)}`}
                    </p>
                  </div>
                  {rescheduleId === ap.id ? (
                    <div className="space-y-3 border-t pt-3">
                      <p className="text-sm font-semibold">Pick a new time</p>
                      <WeekAvailabilityPicker
                        service={ap.service}
                        selectedDate={pickerDate}
                        selectedSlotKey={pickerSlotKey}
                        onSelectDate={(d) => {
                          setPickerDate(d);
                          setPickerSlotKey("");
                        }}
                        onSelectSlot={selectSlot}
                      />
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={!pickerSlotKey || apptBusy === ap.id}
                          onClick={() => void handleReschedule(ap.id)}
                          className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRescheduleId(null);
                            setPickerSlotKey("");
                          }}
                          className="text-sm text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setRescheduleId(ap.id);
                          setRebookOpen(false);
                          setPickerSlotKey("");
                        }}
                        className="text-sm font-semibold text-brand underline"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        disabled={apptBusy === ap.id}
                        onClick={() => void handleCancel(ap.id)}
                        className="text-sm font-semibold text-red-600 underline disabled:opacity-50"
                      >
                        Cancel visit
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {past.length > 0 && (
              <>
                <h2 className="font-bold text-lg text-gray-900 pt-4">Past visits</h2>
                {past.map((ap) => (
                  <div key={ap.id} className="site-card p-4 opacity-80">
                    <p className="font-semibold text-gray-800">{ap.petName || "Your pet"}</p>
                    <p className="text-sm text-gray-500">{formatApptDate(ap.startAt)} · {ap.status}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {hubTab === "dog" && (
          <div className="space-y-6">
            {profileMsg && <p className="text-sm text-brand font-semibold">{profileMsg}</p>}
            {profileError && <p className="text-sm text-red-600">{profileError}</p>}

            <div className="site-card p-6 space-y-4">
              <h2 className="font-bold text-brand">Pet details</h2>
              {pets.map((pet, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3 border-b last:border-0">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                    <input
                      value={pet.petName}
                      onChange={(e) => {
                        const next = [...pets];
                        next[i] = { ...next[i], petName: e.target.value };
                        setPets(next);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Size</label>
                    <select
                      value={pet.petSize}
                      onChange={(e) => {
                        const next = [...pets];
                        next[i] = { ...next[i], petSize: e.target.value };
                        setPets(next);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    >
                      <option value="">Select size</option>
                      {PET_SIZES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setPets([...pets, { petName: "", petSize: "" }])}
                className="text-sm text-brand font-semibold underline"
              >
                + Add another pet
              </button>

              <div className="pt-2 border-t border-gray-100 space-y-3">
                <h3 className="font-semibold text-gray-900 text-sm">Service address</h3>
                <p className="text-xs text-gray-500">
                  Where we come for grooming. Licky can also save this when you chat with him.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Street address
                  </label>
                  <input
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                    placeholder="123 Main St"
                    autoComplete="street-address"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
                    <input
                      value={serviceCity}
                      onChange={(e) => setServiceCity(e.target.value)}
                      placeholder="Irvine"
                      autoComplete="address-level2"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">ZIP</label>
                    <input
                      value={serviceZip}
                      onChange={(e) => setServiceZip(e.target.value)}
                      placeholder="92618"
                      autoComplete="postal-code"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Notes for your groomer
                </label>
                <textarea
                  value={dogNotes}
                  onChange={(e) => setDogNotes(e.target.value)}
                  rows={4}
                  placeholder="Temperament, medical notes, coat preferences…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none"
                />
              </div>
              <button
                type="button"
                disabled={profileBusy}
                onClick={() => void saveProfile()}
                className="site-btn"
              >
                {profileBusy ? "Saving…" : "Save pet info"}
              </button>
            </div>

            <div className="site-card p-6 space-y-4">
              <h2 className="font-bold text-brand">Photos</h2>
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((ph) => (
                    <figure key={ph.id} className="rounded-xl overflow-hidden border border-gray-100">
                      <img src={ph.url} alt={ph.petName ?? "Pet"} className="w-full aspect-square object-cover" />
                      {(ph.caption || ph.petName) && (
                        <figcaption className="text-xs p-2 text-gray-600">
                          {ph.petName}
                          {ph.caption ? ` — ${ph.caption}` : ""}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => void uploadPhoto(e)} className="space-y-3">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  className="text-sm"
                />
                <input
                  value={photoPetName}
                  onChange={(e) => setPhotoPetName(e.target.value)}
                  placeholder="Pet name (optional)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
                <input
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="Caption (optional)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
                <button type="submit" disabled={!photoFile || profileBusy} className="site-btn">
                  Upload photo
                </button>
              </form>
            </div>
          </div>
        )}

        {hubTab === "payments" && (
          <div className="space-y-6">
            {!squareConfigured && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Online payments are not fully configured yet. Please call us to pay by phone.
              </div>
            )}
            {payMsg && <p className="text-sm text-brand font-semibold">{payMsg}</p>}
            {payError && <p className="text-sm text-red-600">{payError}</p>}

            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "pay" as const, label: "Make a payment" },
                  { id: "cards" as const, label: "Cards on file" },
                  { id: "history" as const, label: "History" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPayTab(t.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    payTab === t.id ? "bg-brand text-white border-brand" : "bg-white border-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {payTab === "pay" && (
              <form onSubmit={(e) => void handlePay(e)} className="site-card p-6 space-y-4">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  placeholder="Amount (USD)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl"
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Note (optional)"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none"
                />
                {cards.length > 0 && (
                  <div className="space-y-2">
                    {cards.map((card) => (
                      <label key={card.id} className="flex items-center gap-3 px-4 py-3 border rounded-xl">
                        <input
                          type="radio"
                          checked={!useNewCard && selectedCardId === card.id}
                          onChange={() => {
                            setUseNewCard(false);
                            setSelectedCardId(card.id);
                          }}
                        />
                        <span className="text-sm">
                          {card.brand ?? "Card"} ···{card.last4}
                        </span>
                      </label>
                    ))}
                    <label className="flex items-center gap-3 px-4 py-3 border rounded-xl">
                      <input type="radio" checked={useNewCard} onChange={() => setUseNewCard(true)} />
                      <span className="text-sm">New card</span>
                    </label>
                  </div>
                )}
                {(useNewCard || cards.length === 0) && (
                  <SquareCardField onReady={setPayCard} disabled={payBusy} />
                )}
                <button type="submit" disabled={payBusy || !squareConfigured} className="site-btn w-full">
                  {payBusy ? "Processing…" : "Pay now"}
                </button>
              </form>
            )}

            {payTab === "cards" && (
              <div className="site-card p-6 space-y-4">
                {cards.length === 0 ? (
                  <p className="text-sm text-gray-500">No cards saved yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {cards.map((card) => (
                      <li key={card.id} className="text-sm font-semibold">
                        {card.brand} ···{card.last4}
                      </li>
                    ))}
                  </ul>
                )}
                <SquareCardField onReady={setVaultCard} disabled={payBusy} />
                <button type="button" onClick={() => void handleSaveCard()} disabled={payBusy} className="site-btn">
                  Save card
                </button>
              </div>
            )}

            {payTab === "history" && (
              <div className="site-card p-6">
                {payments.length === 0 ? (
                  <p className="text-sm text-gray-500">No payments yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {payments.map((p) => (
                      <li key={p.id} className="text-sm border-b pb-2">
                        <span className="font-semibold">{formatMoney(p.amountCents)}</span>
                        <span className="text-gray-500 ml-2">
                          {new Date(p.createdAt).toLocaleDateString()} · {p.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </ClientPortalShell>
    </>
  );
}
