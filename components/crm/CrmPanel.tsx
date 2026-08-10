"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPhoneDisplay } from "@/lib/leads/normalize";

type Platform = {
  configured: boolean;
  hasFromNumber: boolean;
  hasVoice: boolean;
  mode: string;
  smsBotEnabled: boolean;
};

type CrmContact = {
  id: string;
  phone: string;
  phoneE164: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  pets: { petName: string; petSize?: string; petBreed?: string }[];
  service?: string;
  smsOptIn?: boolean;
  status: "lead" | "customer" | "inactive";
  tags: string[];
  source: string;
  unreadCount: number;
  botEnabled: boolean;
  lastInteractionAt?: string;
  updatedAt: string;
  groomerName?: string;
};

type CrmInteraction = {
  id: string;
  channel: "sms" | "call" | "note" | "email" | "system";
  direction: "inbound" | "outbound" | "internal";
  body?: string;
  summary?: string;
  messageStatus?: string;
  callStatus?: string;
  actor: string;
  staffName?: string;
  durationSeconds?: number;
  createdAt: string;
};

type ContactDetail = CrmContact & {
  interactions: CrmInteraction[];
  upcomingAppointments: {
    id: string;
    startAt: string;
    status: string;
    service: string;
    petName: string;
    groomerId: string;
  }[];
  pastAppointments: {
    id: string;
    startAt: string;
    status: string;
    service: string;
    petName: string;
    groomerId: string;
  }[];
};

type Stats = {
  total: number;
  leads: number;
  customers: number;
  inactive: number;
  unread: number;
};

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function channelLabel(ix: CrmInteraction): string {
  if (ix.channel === "sms") {
    return ix.direction === "inbound" ? "SMS in" : ix.actor === "bot" ? "Bot SMS" : "SMS out";
  }
  if (ix.channel === "call") {
    return ix.direction === "inbound" ? "Call in" : "Call out";
  }
  return ix.channel;
}

export default function CrmPanel() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "lead" | "customer" | "inactive">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      if (unreadOnly) params.set("unread", "1");
      const res = await fetch(`/api/admin/crm/contacts?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load CRM contacts");
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setStats(data.stats ?? null);
      setPlatform(data.platform ?? null);
      if (!selectedId && data.contacts?.[0]?.id) {
        setSelectedId(data.contacts[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [q, status, unreadOnly, selectedId]);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/contacts/${id}`);
      if (!res.ok) throw new Error("Could not load contact");
      const data = await res.json();
      setDetail(data.contact as ContactDetail);
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detail load failed");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("mds-crm-staff-phone");
      if (saved) setStaffPhone(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) || detail,
    [contacts, selectedId, detail]
  );

  async function refreshFromSources() {
    setBusy("refresh");
    setBanner(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed");
      setBanner(`CRM refreshed — ${data.contactCount} contacts, ${data.interactionCount} interactions`);
      setSelectedId("");
      await loadContacts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(null);
    }
  }

  async function sendSms(template?: "lead_follow_up" | "appointment_follow_up") {
    if (!selectedId) return;
    setBusy("sms");
    setError(null);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/crm/contacts/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template ? { template } : { body: message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "SMS failed");
      setMessage("");
      setBanner("SMS sent");
      await loadDetail(selectedId);
      await loadContacts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "SMS failed");
    } finally {
      setBusy(null);
    }
  }

  async function startCall() {
    if (!selectedId) return;
    setBusy("call");
    setError(null);
    setBanner(null);
    try {
      if (staffPhone.trim()) {
        sessionStorage.setItem("mds-crm-staff-phone", staffPhone.trim());
      }
      const res = await fetch(`/api/admin/crm/contacts/${selectedId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffPhone: staffPhone.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Call failed");
      setBanner("Calling your phone first — answer to connect to the customer.");
      await loadDetail(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Call failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveNote() {
    if (!selectedId || !note.trim()) return;
    setBusy("note");
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/contacts/${selectedId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Note failed");
      setNote("");
      await loadDetail(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Note failed");
    } finally {
      setBusy(null);
    }
  }

  async function toggleBot(enabled: boolean) {
    if (!selectedId) return;
    setBusy("bot");
    try {
      const res = await fetch(`/api/admin/crm/contacts/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botEnabled: enabled }),
      });
      if (!res.ok) throw new Error("Could not update bot setting");
      await loadDetail(selectedId);
      await loadContacts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bot update failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand">CRM</h2>
          <p className="text-sm text-gray-600 mt-1">
            Contacts, SMS, calls, and interaction history — seeded from leads, appointments, and
            client accounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshFromSources()}
            disabled={busy === "refresh"}
            className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 bg-white text-brand hover:border-accent disabled:opacity-50"
          >
            {busy === "refresh" ? "Refreshing…" : "Refresh from customers"}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ["Total", stats.total],
            ["Customers", stats.customers],
            ["Leads", stats.leads],
            ["Inactive", stats.inactive],
            ["Unread", stats.unread],
          ].map(([label, value]) => (
            <div key={label as string} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
              <div className="text-2xl font-bold text-brand mt-1">{value}</div>
            </div>
          ))}
        </div>
      )}

      {platform && (
        <div className="text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
          Twilio SMS:{" "}
          <span className={platform.configured ? "text-green-700 font-semibold" : "text-amber-700 font-semibold"}>
            {platform.configured ? "configured" : "not configured"}
          </span>
          {" · "}
          Voice:{" "}
          <span className={platform.hasVoice ? "text-green-700 font-semibold" : "text-amber-700 font-semibold"}>
            {platform.hasVoice ? "ready" : "needs credentials"}
          </span>
          {" · "}
          SMS bot:{" "}
          <span className="font-semibold text-brand">
            {platform.smsBotEnabled ? "on" : "off"}
          </span>
        </div>
      )}

      {banner && (
        <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 px-4 py-3 text-sm">
          {banner}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-[360px] shrink-0 space-y-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone, pet…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {(["all", "customer", "lead", "inactive"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    status === s
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-brand border-gray-200"
                  }`}
                >
                  {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUnreadOnly((v) => !v)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  unreadOnly
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-brand border-gray-200"
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
            {loading && <div className="p-4 text-sm text-gray-500">Loading contacts…</div>}
            {!loading && contacts.length === 0 && (
              <div className="p-4 text-sm text-gray-500">No contacts match.</div>
            )}
            {contacts.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-4 py-3 hover:bg-section-gray/80 transition-colors ${
                  selectedId === c.id ? "bg-section-gray" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-brand">
                      {c.fullName || formatPhoneDisplay(c.phone)}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatPhoneDisplay(c.phone)}
                      {c.pets[0]?.petName ? ` · ${c.pets[0].petName}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        c.status === "customer"
                          ? "bg-sky-100 text-sky-800"
                          : c.status === "lead"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="text-[10px] font-bold bg-accent text-white rounded-full px-2 py-0.5">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {formatWhen(c.lastInteractionAt || c.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {!selected && (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-sm text-gray-500">
              Select a contact to view their timeline, text, or call.
            </div>
          )}
          {selected && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
              {detailLoading && !detail && (
                <div className="text-sm text-gray-500">Loading contact…</div>
              )}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-brand">
                    {detail?.fullName || selected.fullName || formatPhoneDisplay(selected.phone)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatPhoneDisplay(selected.phone)}
                    {detail?.email ? ` · ${detail.email}` : selected.email ? ` · ${selected.email}` : ""}
                  </p>
                  {(detail?.address || selected.address) && (
                    <p className="text-sm text-gray-500 mt-1">
                      {[detail?.address || selected.address, detail?.city || selected.city, detail?.zipCode || selected.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(detail?.tags || selected.tags).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] uppercase font-semibold tracking-wide bg-section-gray text-brand px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={detail?.botEnabled ?? selected.botEnabled}
                    onChange={(e) => void toggleBot(e.target.checked)}
                    disabled={busy === "bot"}
                  />
                  SMS bot follow-up
                </label>
              </div>

              {detail && (detail.upcomingAppointments.length > 0 || detail.pastAppointments.length > 0) && (
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Upcoming</div>
                    {detail.upcomingAppointments.length === 0 && (
                      <div className="text-sm text-gray-400">None</div>
                    )}
                    {detail.upcomingAppointments.slice(0, 3).map((a) => (
                      <div key={a.id} className="text-sm text-brand border border-gray-100 rounded-lg px-3 py-2 mb-1">
                        {formatWhen(a.startAt)} · {a.petName || "Pet"} · {a.service}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Past</div>
                    {detail.pastAppointments.length === 0 && (
                      <div className="text-sm text-gray-400">None</div>
                    )}
                    {detail.pastAppointments.slice(0, 3).map((a) => (
                      <div key={a.id} className="text-sm text-gray-600 border border-gray-100 rounded-lg px-3 py-2 mb-1">
                        {formatWhen(a.startAt)} · {a.petName || "Pet"} · {a.service}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Send SMS</div>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Type a text message…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void sendSms()}
                      disabled={busy === "sms" || !message.trim()}
                      className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white disabled:opacity-50"
                    >
                      {busy === "sms" ? "Sending…" : "Send SMS"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendSms("lead_follow_up")}
                      disabled={busy === "sms"}
                      className="px-3 py-2 rounded-full text-xs font-semibold border border-gray-200"
                    >
                      Lead follow-up
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendSms("appointment_follow_up")}
                      disabled={busy === "sms"}
                      className="px-3 py-2 rounded-full text-xs font-semibold border border-gray-200"
                    >
                      Rebook follow-up
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Click-to-call</div>
                  <input
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="Your phone (Twilio calls you first)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void startCall()}
                    disabled={busy === "call"}
                    className="px-4 py-2 rounded-full text-sm font-semibold bg-accent text-white disabled:opacity-50"
                  >
                    {busy === "call" ? "Starting…" : "Call contact"}
                  </button>
                  <p className="text-xs text-gray-500">
                    Twilio rings your phone, then bridges to the customer. Set a default with{" "}
                    <code className="text-[11px]">TWILIO_STAFF_CALLBACK_NUMBER</code>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-gray-500">Add note</div>
                <div className="flex gap-2">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Internal CRM note…"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void saveNote()}
                    disabled={busy === "note" || !note.trim()}
                    className="px-4 py-2 rounded-full text-sm font-semibold border border-gray-200 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Interaction timeline
                </div>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {(detail?.interactions || [])
                    .slice()
                    .reverse()
                    .map((ix) => (
                      <div
                        key={ix.id}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          ix.direction === "inbound"
                            ? "border-accent/30 bg-pink-50/40"
                            : ix.actor === "bot"
                              ? "border-sky-200 bg-sky-50/50"
                              : "border-gray-100 bg-section-gray/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
                          <span className="font-semibold text-brand">{channelLabel(ix)}</span>
                          <span>{formatWhen(ix.createdAt)}</span>
                        </div>
                        <div className="mt-1 text-gray-800 whitespace-pre-wrap">
                          {ix.body || ix.summary || "—"}
                        </div>
                        {(ix.messageStatus || ix.callStatus || ix.staffName) && (
                          <div className="mt-1 text-[11px] text-gray-500">
                            {[ix.messageStatus, ix.callStatus, ix.staffName, ix.durationSeconds ? `${ix.durationSeconds}s` : ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                      </div>
                    ))}
                  {detail && detail.interactions.length === 0 && (
                    <div className="text-sm text-gray-400">No interactions yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
