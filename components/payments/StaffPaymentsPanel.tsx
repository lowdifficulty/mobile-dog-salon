"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PaymentCardField, { type PaymentCardInstance } from "./PaymentCardField";
import type { ClientListItem, PaymentHistoryItem, SavedCardSummary } from "@/lib/payments/types";

type Tab = "charge" | "cards" | "history";

type PaymentConfig = {
  configured?: boolean;
  provider?: "stripe" | "square" | "none";
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function StaffPaymentsPanel() {
  const [tab, setTab] = useState<Tab>("charge");
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [cards, setCards] = useState<SavedCardSummary[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [paymentsConfigured, setPaymentsConfigured] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "square" | "none">("none");
  const [providerTesting, setProviderTesting] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [useNewCard, setUseNewCard] = useState(false);
  const [payCard, setPayCard] = useState<PaymentCardInstance | null>(null);
  const [vaultCard, setVaultCard] = useState<PaymentCardInstance | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/staff/payments/clients");
    if (res.ok) {
      const data = await res.json();
      const list = data.clients ?? [];
      setClients(list);
      if (list.length && !clientId) {
        setClientId(list[0].id);
      }
    }
  }, [clientId]);

  const loadCards = useCallback(async () => {
    if (!clientId) return;
    const res = await fetch(`/api/staff/payments/cards?clientId=${encodeURIComponent(clientId)}`);
    if (res.ok) {
      const data = await res.json();
      setCards(data.cards ?? []);
      if (data.cards?.length) {
        setSelectedCardId(data.cards[0].id);
      }
    }
  }, [clientId]);

  const loadHistory = useCallback(async () => {
    const url = clientId
      ? `/api/staff/payments/history?clientId=${encodeURIComponent(clientId)}`
      : "/api/staff/payments/history";
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setPayments(data.payments ?? []);
    }
  }, [clientId]);

  useEffect(() => {
    loadClients();
    fetch("/api/payments/config")
      .then((r) => r.json())
      .then((c: PaymentConfig) => {
        setPaymentsConfigured(Boolean(c.configured));
        setPaymentProvider(c.provider ?? "none");
      });
    fetch("/api/admin/payments")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.stripeStatus?.ok) {
          setSetupMessage(
            `Stripe connected (${data.stripeStatus.livemode ? "live" : "test"} mode).`
          );
        } else if (data?.squareStatus?.ok) {
          const location = data.squareStatus.locationName
            ? `${data.squareStatus.locationName}`
            : data.squareStatus.locationId;
          setSetupMessage(
            `Square connected (${data.squareStatus.environment} mode${location ? ` · ${location}` : ""}).`
          );
        }
      })
      .catch(() => undefined);
  }, [loadClients]);

  useEffect(() => {
    if (!clientId) return;
    loadCards();
    if (tab === "history") loadHistory();
  }, [clientId, tab, loadCards, loadHistory]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!clientId) {
      setError("Select a client first.");
      return;
    }
    setBusy(true);

    try {
      const body: Record<string, string> = {
        clientId,
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

      const res = await fetch("/api/staff/payments/pay", {
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
      setMessage(`Charged ${formatMoney(data.payment.amountCents)} to ${data.payment.clientName}.`);
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
    if (!clientId) {
      setError("Select a client first.");
      return;
    }
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
    const res = await fetch("/api/staff/payments/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, sourceId: result.token }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save card");
      return;
    }
    setMessage("Card saved for client.");
    await loadCards();
  }

  const handlePayCardReady = useCallback((card: PaymentCardInstance | null) => {
    setPayCard(card);
  }, []);

  const handleVaultCardReady = useCallback((card: PaymentCardInstance | null) => {
    setVaultCard(card);
  }, []);

  async function testPaymentConnection() {
    setProviderTesting(true);
    setSetupMessage("");
    setError("");
    try {
      const action = paymentProvider === "square" ? "test-square" : "test-stripe";
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Connection test failed");
      setSetupMessage(data.message ?? "Payment processor connected.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection test failed");
    } finally {
      setProviderTesting(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "charge", label: "Charge client" },
    { id: "cards", label: "Client cards" },
    { id: "history", label: "Payment history" },
  ];

  return (
    <div>
      {!paymentsConfigured && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
          <p>
            Payments are not configured yet. Add Stripe or Square credentials in Vercel /{" "}
            <code className="font-mono text-xs">.env.local</code>, then redeploy.
          </p>
          <p className="text-xs text-amber-800">
            Stripe: <code className="font-mono text-xs">STRIPE_SECRET_KEY</code>,{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>
          </p>
          <p className="text-xs text-amber-800">
            Square: <code className="font-mono text-xs">SQUARE_ACCESS_TOKEN</code>,{" "}
            <code className="font-mono text-xs">SQUARE_APPLICATION_ID</code>,{" "}
            <code className="font-mono text-xs">SQUARE_LOCATION_ID</code>
          </p>
          <p className="text-xs text-amber-800">
            If both are set, Stripe is used unless{" "}
            <code className="font-mono text-xs">PAYMENT_PROVIDER=square</code>.
          </p>
        </div>
      )}

      {paymentsConfigured && paymentProvider === "stripe" && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong>Stripe</strong> is the active payment processor.
            {setupMessage ? ` ${setupMessage}` : " Test the connection before charging clients."}
          </div>
          <button
            type="button"
            onClick={() => void testPaymentConnection()}
            disabled={providerTesting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-600 text-green-800 bg-white disabled:opacity-50"
          >
            {providerTesting ? "Testing…" : "Test Stripe"}
          </button>
        </div>
      )}

      {paymentsConfigured && paymentProvider === "square" && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900 flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong>Square</strong> is the active payment processor.
            {setupMessage ? ` ${setupMessage}` : " Test the connection before charging clients."}
          </div>
          <button
            type="button"
            onClick={() => void testPaymentConnection()}
            disabled={providerTesting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-600 text-green-800 bg-white disabled:opacity-50"
          >
            {providerTesting ? "Testing…" : "Test Square"}
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-[220px]">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Client account</label>
          {clients.length === 0 ? (
            <p className="text-sm text-gray-500">
              No client accounts yet. Clients can register at{" "}
              <Link href="/client/register" className="text-brand font-semibold hover:underline">
                /client/register
              </Link>
              .
            </p>
          ) : (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm font-semibold"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} ({c.email})
                </option>
              ))}
            </select>
          )}
        </div>
        <Link
          href="/client/login"
          className="text-sm font-semibold text-brand hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open client payment portal →
        </Link>
      </div>

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

      {tab === "charge" && (
        <form onSubmit={handlePay} className="site-card p-6 space-y-4">
          {selectedClient && (
            <p className="text-sm text-gray-600">
              Charging <strong>{selectedClient.firstName} {selectedClient.lastName}</strong>
            </p>
          )}
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
              placeholder="Service, pet name, groomer…"
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
                      name="staffPayCard"
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
                    name="staffPayCard"
                    checked={useNewCard}
                    onChange={() => setUseNewCard(true)}
                  />
                  <span className="text-sm font-semibold text-gray-800">Use a new card</span>
                </label>
              </div>
            </div>
          )}

          {(useNewCard || cards.length === 0) && (
            <PaymentCardField onReady={handlePayCardReady} disabled={busy} />
          )}

          <button
            type="submit"
            disabled={busy || !paymentsConfigured || !clientId}
            className="site-btn w-full"
          >
            {busy ? "Processing…" : "Charge card"}
          </button>
        </form>
      )}

      {tab === "cards" && (
        <div className="space-y-6">
          <div className="site-card p-6">
            <h2 className="font-bold text-brand mb-4">Saved cards</h2>
            {cards.length === 0 ? (
              <p className="text-sm text-gray-500">No cards on file for this client.</p>
            ) : (
              <ul className="space-y-3">
                {cards.map((card) => (
                  <li
                    key={card.id}
                    className="px-4 py-3 border border-gray-100 rounded-xl text-sm font-semibold text-gray-800"
                  >
                    {card.brand ?? "Card"} ···{card.last4}
                    {card.expMonth && card.expYear
                      ? ` · exp ${card.expMonth}/${String(card.expYear).slice(-2)}`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="site-card p-6">
            <h2 className="font-bold text-brand mb-4">Add card for client</h2>
            <PaymentCardField onReady={handleVaultCardReady} disabled={busy} />
            <button
              type="button"
              onClick={handleSaveCard}
              disabled={busy || !paymentsConfigured || !clientId}
              className="site-btn mt-4 w-full"
            >
              {busy ? "Saving…" : "Save card on file"}
            </button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="site-card p-6">
          <h2 className="font-bold text-brand mb-4">
            {clientId ? "Client payments" : "Recent payments"}
          </h2>
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
                        {p.clientName ? ` · ${p.clientName}` : ""}
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
    </div>
  );
}
