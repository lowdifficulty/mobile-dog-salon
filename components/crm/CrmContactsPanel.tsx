"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPhoneDisplay } from "@/lib/leads/normalize";

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
  status: "lead" | "customer" | "inactive";
  tags: string[];
  source: string;
  unreadCount: number;
  botEnabled: boolean;
  lastInteractionAt?: string;
  updatedAt: string;
  groomerName?: string;
};

type Stats = {
  total: number;
  leads: number;
  customers: number;
  inactive: number;
  unread: number;
};

type ContactDetail = CrmContact & {
  interactions: { id: string; channel: string; direction: string; createdAt: string }[];
  upcomingAppointments: {
    id: string;
    startAt: string;
    status: string;
    service: string;
    petName: string;
  }[];
  pastAppointments: {
    id: string;
    startAt: string;
    status: string;
    service: string;
    petName: string;
  }[];
};

function formatWhen(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function displayName(c: CrmContact): string {
  return (
    c.fullName?.trim() ||
    [c.firstName, c.lastName].filter(Boolean).join(" ").trim() ||
    formatPhoneDisplay(c.phone)
  );
}

export default function CrmContactsPanel({
  onOpenConversation,
}: {
  onOpenConversation?: (contactId: string) => void;
}) {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "lead" | "customer" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/crm/contacts?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load contacts");
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setStats(data.stats ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Detail load failed");
    }
  }, []);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) || detail,
    [contacts, selectedId, detail]
  );

  async function syncCustomers() {
    setBusy(true);
    setBanner(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setBanner(`Synced ${data.contactCount} contacts`);
      await loadContacts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  function openConversation() {
    if (!selectedId || !onOpenConversation) return;
    onOpenConversation(selectedId);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand">Contacts</h2>
          <p className="text-sm text-gray-600 mt-1">
            Customers and leads from bookings, SMS, and CRM. Open a conversation to text or call.
          </p>
        </div>
        {stats && (
          <p className="text-xs text-gray-500">
            {stats.total} total · {stats.customers} customers · {stats.leads} leads · {stats.unread}{" "}
            unread
          </p>
        )}
      </div>

      {(banner || error) && (
        <div className="space-y-2">
          {banner && (
            <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 px-4 py-2 text-sm">
              {banner}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-2 text-sm">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, phone, email…"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm min-w-[220px] flex-1 max-w-md"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="customer">Customers</option>
          <option value="lead">Leads</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          type="button"
          onClick={() => void syncCustomers()}
          disabled={busy}
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 disabled:opacity-50"
        >
          {busy ? "Syncing…" : "Sync from bookings"}
        </button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 min-h-[520px]">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col min-h-[420px]">
          <div className="px-4 py-2 border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Directory
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="p-6 text-sm text-gray-500">Loading contacts…</div>
            )}
            {!loading && contacts.length === 0 && (
              <div className="p-6 text-sm text-gray-500">No contacts match your filters.</div>
            )}
            {contacts.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${
                    active ? "bg-sky-50 border-l-4 border-l-brand" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-brand text-sm">{displayName(c)}</div>
                      <div className="text-xs text-gray-500">{formatPhoneDisplay(c.phone)}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] uppercase font-semibold text-gray-500">
                        {c.status}
                      </span>
                      {c.unreadCount > 0 && (
                        <span className="text-[10px] font-bold bg-accent text-white rounded-full px-2 py-0.5">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.lastInteractionAt && (
                    <div className="text-[11px] text-gray-400 mt-1">
                      Last activity {formatWhen(c.lastInteractionAt)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 min-h-[420px]">
          {!selected && (
            <div className="text-sm text-gray-500 py-8 text-center">
              Select a contact to view details.
            </div>
          )}
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
                    Contact
                  </div>
                  <div className="font-bold text-brand text-lg mt-1">
                    {detail?.fullName || displayName(selected as CrmContact)}
                  </div>
                  <div className="text-sm text-gray-600">{formatPhoneDisplay(selected.phone)}</div>
                  {(detail?.email || selected.email) && (
                    <div className="text-sm text-gray-600">{detail?.email || selected.email}</div>
                  )}
                </div>
                {onOpenConversation && (
                  <button
                    type="button"
                    onClick={openConversation}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white"
                  >
                    Open conversation
                  </button>
                )}
              </div>

              {(detail?.address || selected.address) && (
                <div className="text-sm text-gray-600">
                  {[detail?.address || selected.address, detail?.city || selected.city, detail?.zipCode || selected.zipCode]
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">
                  Pets
                </div>
                {(detail?.pets || selected.pets).length === 0 ? (
                  <div className="text-sm text-gray-400">No pets on file</div>
                ) : (
                  (detail?.pets || selected.pets).map((p, i) => (
                    <div key={`${p.petName}-${i}`} className="text-sm text-gray-700">
                      {p.petName || "Pet"} {p.petSize ? `· ${p.petSize}` : ""}
                    </div>
                  ))
                )}
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">
                  Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {(detail?.tags || selected.tags).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {(detail?.tags || selected.tags).length === 0 && (
                    <span className="text-sm text-gray-400">None</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-1">
                  Upcoming appointments
                </div>
                {(detail?.upcomingAppointments || []).slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className="text-sm border border-gray-100 rounded-lg px-2 py-1.5 mb-1"
                  >
                    {formatWhen(a.startAt)} · {a.petName || "Pet"} · {a.service}
                  </div>
                ))}
                {detail && detail.upcomingAppointments.length === 0 && (
                  <div className="text-sm text-gray-400">None scheduled</div>
                )}
              </div>

              <div className="text-xs text-gray-500">
                Source: {selected.source}
                {selected.groomerName ? ` · Groomer: ${selected.groomerName}` : ""}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
