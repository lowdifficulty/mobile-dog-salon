"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClientPortalShell from "./ClientPortalShell";
import SquareCardField from "./SquareCardField";
import type { ClientSessionUser, PaymentHistoryItem, SavedCardSummary } from "@/lib/payments/types";

type Tab = "pay" | "cards" | "history";

type SquareCardInstance = {
  tokenize: () => Promise<{ status: string; token?: string; errors?: Array<{ message: string }> }>;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function ClientPortal() {
  const router = useRouter();
  const [client, setClient] = useState<ClientSessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pay");
  const [cards, setCards] = useState<SavedCardSummary[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [squareConfigured, setSquareConfigured] = useState(true);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [useNewCard, setUseNewCard] = useState(false);
  const [payCard, setPayCard] = useState<SquareCardInstance | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [vaultCard, setVaultCard] = useState<SquareCardInstance | null>(null);

  const loadSession = useCallback(async () => {
    const res = await fetch("/api/client/session");
    const data = await res.json();
    if (!data.client) {
      router.replace("/client/login");
      return;
    }
    setClient(data.client);
    setLoading(false);
  }, [router]);

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
    loadCards();
    loadHistory();
  }, [client, loadCards, loadHistory]);

  async function logout() {
    await fetch("/api/client/logout", { method: "POST" });
    router.push("/client/login");
    router.refresh();
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const body: Record<string, string> = {
        amountDollars: amount,
        note,
      };

      if (useNewCard || !cards.length) {
        if (!payCard) {
          setError("Card form is not ready.");
          setBusy(false);
          return;
        }
        const result = await payCard.tokenize();
        if (result.status !== "OK" || !result.token) {
          setError(result.errors?.[0]?.message ?? "Could not read card.");
          setBusy(false);
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
        setError(data.error ?? "Payment failed");
        setBusy(false);
        return;
      }
      setMessage(`Payment of ${formatMoney(data.payment.amountCents)} completed successfully.`);
      setAmount("");
      setNote("");
      await loadHistory();
      await loadCards();
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  async function handleSaveCard() {
    setError("");
    setMessage("");
    if (!vaultCard) {
      setError("Card form is not ready.");
      return;
    }
    setBusy(true);
    const result = await vaultCard.tokenize();
    if (result.status !== "OK" || !result.token) {
      setError(result.errors?.[0]?.message ?? "Could not read card.");
      setBusy(false);
      return;
    }
    const res = await fetch("/api/payments/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId: result.token }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save card");
      return;
    }
    setMessage("Card saved on file.");
    await loadCards();
  }

  async function handleRemoveCard(cardId: string) {
    setBusy(true);
    const res = await fetch(`/api/payments/cards/${encodeURIComponent(cardId)}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setMessage("Card removed.");
      await loadCards();
    } else {
      setError("Could not remove card.");
    }
  }

  const handlePayCardReady = useCallback((card: SquareCardInstance | null) => {
    setPayCard(card);
  }, []);

  const handleVaultCardReady = useCallback((card: SquareCardInstance | null) => {
    setVaultCard(card);
  }, []);

  if (loading) {
    return (
      <ClientPortalShell title="Client portal">
        <p className="text-gray-500">Loading…</p>
      </ClientPortalShell>
    );
  }

  if (!client) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "pay", label: "Make a payment" },
    { id: "cards", label: "Cards on file" },
    { id: "history", label: "Payment history" },
  ];

  return (
    <ClientPortalShell
      title={`${client.firstName}'s payment portal`}
      subtitle="Secure payments powered by Square."
      onLogout={logout}
    >
      {!squareConfigured && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Online payments are not fully configured yet. Please call us to pay by phone.
        </div>
      )}

      {message && <p className="text-sm text-brand font-semibold mb-4">{message}</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              tab === t.id
                ? "bg-brand text-white border-brand"
                : "bg-white text-brand border-gray-200 hover:border-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pay" && (
        <form onSubmit={handlePay} className="site-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (USD)</label>
            <input
              type="number"
              min="1"
              max="10000"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="120.00"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Pet name, service, or special instructions…"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none"
            />
          </div>

          {cards.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment method</label>
              <div className="space-y-2">
                {cards.map((card) => (
                  <label
                    key={card.id}
                    className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="payCard"
                      checked={!useNewCard && selectedCardId === card.id}
                      onChange={() => {
                        setUseNewCard(false);
                        setSelectedCardId(card.id);
                      }}
                    />
                    <span className="text-sm font-semibold text-gray-800">
                      {card.brand ?? "Card"} ···{card.last4}
                    </span>
                  </label>
                ))}
                <label className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="payCard"
                    checked={useNewCard}
                    onChange={() => setUseNewCard(true)}
                  />
                  <span className="text-sm font-semibold text-gray-800">Use a new card</span>
                </label>
              </div>
            </div>
          )}

          {(useNewCard || cards.length === 0) && (
            <SquareCardField onReady={handlePayCardReady} disabled={busy} />
          )}

          <button type="submit" disabled={busy || !squareConfigured} className="site-btn w-full">
            {busy ? "Processing…" : "Pay now"}
          </button>
        </form>
      )}

      {tab === "cards" && (
        <div className="space-y-6">
          <div className="site-card p-6">
            <h2 className="font-bold text-brand mb-4">Saved cards</h2>
            {cards.length === 0 ? (
              <p className="text-sm text-gray-500">No cards on file yet.</p>
            ) : (
              <ul className="space-y-3">
                {cards.map((card) => (
                  <li
                    key={card.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 border border-gray-100 rounded-xl"
                  >
                    <span className="text-sm font-semibold text-gray-800">
                      {card.brand ?? "Card"} ···{card.last4}
                      {card.expMonth && card.expYear
                        ? ` · exp ${card.expMonth}/${String(card.expYear).slice(-2)}`
                        : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCard(card.id)}
                      disabled={busy}
                      className="text-sm font-semibold text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="site-card p-6">
            <h2 className="font-bold text-brand mb-4">Add a card</h2>
            <SquareCardField onReady={handleVaultCardReady} disabled={busy} />
            <button
              type="button"
              onClick={handleSaveCard}
              disabled={busy || !squareConfigured}
              className="site-btn mt-4 w-full"
            >
              {busy ? "Saving…" : "Save card on file"}
            </button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="site-card p-6">
          <h2 className="font-bold text-brand mb-4">Past payments</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {payments.map((p) => (
                <li key={p.id} className="py-4 first:pt-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-brand">{formatMoney(p.amountCents)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(p.createdAt).toLocaleString("en-US", {
                          timeZone: "America/Los_Angeles",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {" · "}
                        {p.status}
                        {p.cardBrand && p.cardLast4 ? ` · ${p.cardBrand} ${p.cardLast4}` : ""}
                      </p>
                    </div>
                  </div>
                  {p.note && (
                    <p className="text-sm text-gray-600 mt-2 italic">&ldquo;{p.note}&rdquo;</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ClientPortalShell>
  );
}
