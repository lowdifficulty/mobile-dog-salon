"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPhoneDisplay } from "@/lib/leads/normalize";

type Platform = {
  configured: boolean;
  hasFromNumber: boolean;
  hasVoice: boolean;
  mode: string;
  smsBotEnabled: boolean;
  smsBotMode?: string;
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
  metadata?: Record<string, string | number | boolean | null>;
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

function initials(name?: string, phone?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return (phone || "?").slice(-2);
}

export default function CrmPanel() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "lead" | "customer" | "inactive">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [note, setNote] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

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
      if (!selectedId && data.contacts?.[0]?.id) setSelectedId(data.contacts[0].id);
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
    try {
      const res = await fetch(`/api/admin/crm/contacts/${id}`);
      if (!res.ok) throw new Error("Could not load contact");
      const data = await res.json();
      setDetail(data.contact as ContactDetail);
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detail load failed");
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

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [detail?.interactions?.length, selectedId]);

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) || detail,
    [contacts, selectedId, detail]
  );

  const smsThread = useMemo(() => {
    // Keep chat focused on real SMS/calls/notes. Appointment system events
    // (one per recurring visit) live in the appointments panel, not the thread.
    return (detail?.interactions || []).filter(
      (ix) => ix.channel === "sms" || ix.channel === "call" || ix.channel === "note"
    );
  }, [detail]);

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
      setBanner(`Synced ${data.contactCount} contacts`);
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
      if (staffPhone.trim()) sessionStorage.setItem("mds-crm-staff-phone", staffPhone.trim());
      const res = await fetch(`/api/admin/crm/contacts/${selectedId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffPhone: staffPhone.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Call failed");
      setBanner("Calling your phone first — answer to connect.");
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
    <div className="h-[calc(100vh-3.5rem)] flex flex-col min-h-[640px]">
      {(banner || error || platform) && (
        <div className="px-4 py-2 border-b border-gray-200 bg-white flex flex-wrap gap-3 items-center text-xs">
          {platform && (
            <span className="text-gray-500">
              Twilio {platform.configured ? "ready" : "needs setup"} · SMS bot{" "}
              {platform.smsBotEnabled ? `on (${platform.smsBotMode || "test"})` : "off"}
            </span>
          )}
          {stats && (
            <span className="text-gray-500">
              {stats.total} contacts · {stats.unread} unread
            </span>
          )}
          <button
            type="button"
            onClick={() => void refreshFromSources()}
            disabled={busy === "refresh"}
            className="ml-auto font-semibold text-brand hover:underline disabled:opacity-50"
          >
            Sync customers
          </button>
          {banner && <span className="text-green-700 font-medium">{banner}</span>}
          {error && <span className="text-red-700 font-medium">{error}</span>}
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
        {/* Conversations list */}
        <section className="border-r border-gray-200 bg-white flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-100 space-y-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search conversations…"
              className="w-full rounded-lg border border-gray-200 bg-[#f8fafc] px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-1">
              {(["all", "customer", "lead", "inactive"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                    status === s ? "bg-brand text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUnreadOnly((v) => !v)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                  unreadOnly ? "bg-accent text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                Unread
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="p-4 text-sm text-gray-500">Loading…</div>}
            {!loading && contacts.length === 0 && (
              <div className="p-4 text-sm text-gray-500">No conversations</div>
            )}
            {contacts.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-3 py-3 border-b border-gray-50 flex gap-3 hover:bg-[#f8fafc] ${
                    active ? "bg-[#eef6ff]" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {initials(c.fullName, c.phone)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {c.fullName || formatPhoneDisplay(c.phone)}
                      </div>
                      <div className="text-[10px] text-gray-400 shrink-0">
                        {formatWhen(c.lastInteractionAt || c.updatedAt)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {formatPhoneDisplay(c.phone)}
                      {c.pets[0]?.petName ? ` · ${c.pets[0].petName}` : ""}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        {c.status}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-accent text-white rounded-full px-1.5">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Thread */}
        <section className="bg-[#f5f7fb] flex flex-col min-h-0 border-r border-gray-200">
          {!selected && (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              Select a conversation
            </div>
          )}
          {selected && (
            <>
              <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-brand">
                    {detail?.fullName || selected.fullName || formatPhoneDisplay(selected.phone)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatPhoneDisplay(selected.phone)}
                    {selected.email ? ` · ${selected.email}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void startCall()}
                    disabled={busy === "call"}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-white disabled:opacity-50"
                  >
                    Call
                  </button>
                </div>
              </div>

              <div ref={threadRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {smsThread.map((ix) => {
                  const mine = ix.direction === "outbound" || ix.direction === "internal";
                  const suppressed = Boolean(ix.metadata?.suppressed);
                  return (
                    <div
                      key={ix.id}
                      className={`flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
                          ix.channel === "note"
                            ? "bg-amber-50 border border-amber-100 text-amber-950"
                            : ix.channel === "call"
                              ? "bg-white border border-gray-200 text-gray-800"
                              : mine
                                ? suppressed
                                  ? "bg-sky-100 text-sky-950 border border-sky-200"
                                  : "bg-brand text-white"
                                : "bg-white text-gray-800 border border-gray-100"
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wide opacity-70 mb-1">
                          {ix.channel === "note"
                            ? "Note"
                            : ix.channel === "call"
                              ? ix.direction === "inbound"
                                ? "Inbound call"
                                : "Outbound call"
                              : ix.channel === "system"
                                ? "System"
                                : ix.actor === "bot"
                                  ? suppressed
                                    ? "Bot draft (not sent)"
                                    : "Bot"
                                  : mine
                                    ? "You"
                                    : "Customer"}
                          {" · "}
                          {formatWhen(ix.createdAt)}
                        </div>
                        <div className="whitespace-pre-wrap">{ix.body || ix.summary || "—"}</div>
                      </div>
                    </div>
                  );
                })}
                {detail && smsThread.length === 0 && (
                  <div className="text-center text-sm text-gray-400 py-10">
                    No messages yet — send the first SMS below.
                  </div>
                )}
              </div>

              <div className="bg-white border-t border-gray-200 p-3 space-y-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Write an SMS…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
                />
                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => void sendSms()}
                    disabled={busy === "sms" || !message.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white disabled:opacity-50"
                  >
                    Send
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendSms("lead_follow_up")}
                    disabled={busy === "sms"}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200"
                  >
                    Lead follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => void sendSms("appointment_follow_up")}
                    disabled={busy === "sms"}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200"
                  >
                    Rebook
                  </button>
                  <input
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    placeholder="Your phone for click-to-call"
                    className="ml-auto border border-gray-200 rounded-lg px-2 py-1.5 text-xs w-44"
                  />
                </div>
              </div>
            </>
          )}
        </section>

        {/* Contact details */}
        <section className="bg-white flex flex-col min-h-0 overflow-y-auto">
          {!selected && (
            <div className="p-6 text-sm text-gray-500">Contact details appear here.</div>
          )}
          {selected && (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
                  Contact
                </div>
                <div className="font-bold text-brand mt-1">
                  {detail?.fullName || selected.fullName || formatPhoneDisplay(selected.phone)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {formatPhoneDisplay(selected.phone)}
                </div>
                {(detail?.email || selected.email) && (
                  <div className="text-sm text-gray-600">{detail?.email || selected.email}</div>
                )}
                {(detail?.address || selected.address) && (
                  <div className="text-sm text-gray-500 mt-1">
                    {[
                      detail?.address || selected.address,
                      detail?.city || selected.city,
                      detail?.zipCode || selected.zipCode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">
                  Pets
                </div>
                {(detail?.pets || selected.pets).length === 0 && (
                  <div className="text-sm text-gray-400">No pets on file</div>
                )}
                {(detail?.pets || selected.pets).map((p, i) => (
                  <div key={`${p.petName}-${i}`} className="text-sm text-gray-700">
                    {p.petName || "Pet"} {p.petSize ? `· ${p.petSize}` : ""}
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">
                  Upcoming
                </div>
                {(detail?.upcomingAppointments || []).slice(0, 3).map((a) => (
                  <div key={a.id} className="text-sm border border-gray-100 rounded-lg px-2 py-1.5 mb-1">
                    {formatWhen(a.startAt)} · {a.petName || "Pet"} · {a.service}
                  </div>
                ))}
                {detail && detail.upcomingAppointments.length === 0 && (
                  <div className="text-sm text-gray-400">None</div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={detail?.botEnabled ?? selected.botEnabled}
                  onChange={(e) => void toggleBot(e.target.checked)}
                  disabled={busy === "bot"}
                />
                SMS bot for this contact
              </label>

              <div className="flex flex-wrap gap-1">
                {(detail?.tags || selected.tags).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] uppercase font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">
                  Add note
                </div>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="Internal note…"
                />
                <button
                  type="button"
                  onClick={() => void saveNote()}
                  disabled={busy === "note" || !note.trim()}
                  className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 disabled:opacity-50"
                >
                  Save note
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
