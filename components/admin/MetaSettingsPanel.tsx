"use client";

import { useCallback, useEffect, useState } from "react";

type MetaStatus = {
  configured: boolean;
  hasPageToken: boolean;
  hasPageId: boolean;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
  hasInstagram: boolean;
  mode: string;
};

type MetaConfig = {
  appId: string;
  appSecret: string;
  pageId: string;
  pageAccessToken: string;
  instagramAccountId: string;
  verifyToken: string;
  webhookBaseUrl: string;
  backfilledAt?: string;
  pageAccessTokenMasked?: string;
  appSecretMasked?: string;
};

export default function MetaSettingsPanel() {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [config, setConfig] = useState<MetaConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/meta");
      if (!res.ok) throw new Error("Could not load Meta settings");
      const data = await res.json();
      setStatus(data.status);
      setConfig({
        appId: data.config?.appId ?? "",
        appSecret: data.config?.appSecret ?? "",
        pageId: data.config?.pageId ?? "",
        pageAccessToken: data.config?.pageAccessToken ?? "",
        instagramAccountId: data.config?.instagramAccountId ?? "",
        verifyToken: data.config?.verifyToken ?? "",
        webhookBaseUrl: data.config?.webhookBaseUrl ?? "",
        backfilledAt: data.config?.backfilledAt,
        pageAccessTokenMasked: data.config?.pageAccessTokenMasked,
        appSecretMasked: data.config?.appSecretMasked,
      });
      setWebhookUrl(data.webhookUrl ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setConfig({
        appId: "",
        appSecret: "",
        pageId: "",
        pageAccessToken: "",
        instagramAccountId: "",
        verifyToken: "",
        webhookBaseUrl: "",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/meta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus(data.status);
      setMessage("Meta settings saved");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Test failed");
      setTestResult(`Connected to page: ${data.pageName || data.pageId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  async function runBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "backfill", days: 7 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Backfill failed");
      setBackfillResult(
        `Imported ${data.messagesImported} messages from ${data.conversationsScanned} conversations (${data.contactsCreated} new contacts, ${data.contactsLinked} linked). Skipped ${data.messagesSkipped} duplicates/empty.`
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backfill failed");
    } finally {
      setBackfilling(false);
    }
  }

  if (loading || !config) {
    return <div className="text-sm text-gray-500">Loading Meta settings…</div>;
  }

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-brand">Meta Messenger & Instagram</h2>
        <p className="text-sm text-gray-600 mt-1">
          Connect Facebook Page and Instagram DMs to the staff Conversations inbox. Set the webhook
          URL in Meta Developer Console → Webhooks → Page → messages.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 px-4 py-3 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status?.configured ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
            {status?.configured ? "Connected" : "Not configured"}
          </span>
          {status?.hasInstagram && (
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
              Instagram linked
            </span>
          )}
        </div>

        {webhookUrl && (
          <div className="text-sm">
            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
              Webhook callback URL
            </div>
            <code className="block bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs break-all">
              {webhookUrl}
            </code>
          </div>
        )}

        {config.backfilledAt && (
          <p className="text-xs text-gray-500">
            Last backfill: {new Date(config.backfilledAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 grid md:grid-cols-2 gap-4">
        {(
          [
            ["appId", "App ID"],
            ["pageId", "Page ID"],
            ["instagramAccountId", "Instagram account ID (optional)"],
            ["verifyToken", "Webhook verify token"],
            ["webhookBaseUrl", "Public site base URL"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block md:col-span-1">
            <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{label}</span>
            <input
              value={config[key]}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        ))}

        <label className="block md:col-span-2">
          <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
            Page access token
          </span>
          <input
            type="password"
            value={config.pageAccessToken}
            onChange={(e) => setConfig({ ...config, pageAccessToken: e.target.value })}
            placeholder={config.pageAccessTokenMasked || "Paste page token"}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
            App secret (for webhook signature verification)
          </span>
          <input
            type="password"
            value={config.appSecret}
            onChange={(e) => setConfig({ ...config, appSecret: e.target.value })}
            placeholder={config.appSecretMasked || "Paste app secret"}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Meta settings"}
        </button>
        <button
          type="button"
          onClick={() => void testConnection()}
          disabled={testing}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200"
        >
          {testing ? "Testing…" : "Test connection"}
        </button>
        <button
          type="button"
          onClick={() => void runBackfill()}
          disabled={backfilling || !status?.configured}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 disabled:opacity-50"
        >
          {backfilling ? "Backfilling…" : "Backfill last 7 days"}
        </button>
      </div>

      {testResult && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          {testResult}
        </div>
      )}
      {backfillResult && (
        <div className="text-sm text-brand bg-[#f8fafc] border border-gray-100 rounded-lg px-3 py-2">
          {backfillResult}
        </div>
      )}
    </div>
  );
}
