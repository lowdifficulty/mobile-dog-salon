"use client";

import { useCallback, useEffect, useState } from "react";

type Status = {
  configured: boolean;
  hasFromNumber: boolean;
  hasVoice: boolean;
  hasAccountSid: boolean;
  hasApiKey: boolean;
  mode: string;
  fromNumberMasked?: string;
  accountSidMasked?: string;
};

type Config = {
  accountSid: string;
  fromNumber: string;
  voiceCallerId: string;
  staffCallbackNumber: string;
  voiceForwardNumber: string;
  webhookBaseUrl: string;
  hasEnvApiKey: boolean;
  hasEnvAccountSid: boolean;
};

export default function TwilioSettingsPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/twilio");
      if (!res.ok) throw new Error("Could not load Twilio settings");
      const data = await res.json();
      setStatus(data.status);
      setConfig(data.config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
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
      const res = await fetch("/api/admin/twilio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStatus(data.status);
      setMessage("Twilio settings saved");
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
      const res = await fetch("/api/admin/twilio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Test failed");
      const nums = (data.numbers || [])
        .map((n: { phoneNumber: string }) => n.phoneNumber)
        .join(", ");
      setTestResult(
        `Connected to ${data.account.friendlyName} (${data.account.status}). Numbers: ${nums || "none"}`
      );
      setStatus(data.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading || !config) {
    return <div className="p-6 text-sm text-gray-500">Loading Twilio settings…</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-bold text-brand">Twilio / Messaging</h2>
        <p className="text-sm text-gray-600 mt-1">
          Configure SMS and calling for the CRM. API key credentials stay in environment
          variables; Account SID and numbers can be set here.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[
          ["API key", status?.hasApiKey ? "Ready" : "Missing in env"],
          ["Account SID", status?.hasAccountSid ? status.accountSidMasked : "Required"],
          ["From number", status?.hasFromNumber ? status.fromNumberMasked : "Required"],
          ["Voice", status?.hasVoice ? "Ready" : "Needs caller ID"],
        ].map(([label, value]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div className="text-xs uppercase text-gray-500 tracking-wide">{label}</div>
            <div className="font-semibold text-brand mt-1">{value}</div>
          </div>
        ))}
      </div>

      {!config.hasEnvApiKey && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
          Set <code>TWILIO_API_KEY_SID</code> and <code>TWILIO_API_KEY_SECRET</code> in{" "}
          <code>.env.local</code> / Vercel. They cannot be stored from this form.
        </div>
      )}

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
      {testResult && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 text-sky-900 px-4 py-3 text-sm">
          {testResult}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        {(
          [
            ["accountSid", "Account SID (AC…)", "ACxxxxxxxx"],
            ["fromNumber", "SMS From number", "+19497558994"],
            ["voiceCallerId", "Voice caller ID", "+19497558994"],
            ["staffCallbackNumber", "Staff click-to-call phone", "+1…"],
            ["voiceForwardNumber", "Inbound call forward-to", "+1…"],
            ["webhookBaseUrl", "Webhook base URL", "https://mobiledog-salon.com"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <label key={key} className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {label}
            </span>
            <input
              value={config[key]}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              placeholder={placeholder}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </label>
        ))}

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={testing}
            className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 bg-white disabled:opacity-50"
          >
            {testing ? "Testing…" : "Test connection"}
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          Twilio Console → Phone Number → Messaging webhook:{" "}
          <code>/api/twilio/inbound</code>
        </p>
        <p>
          Voice webhook: <code>/api/twilio/voice</code>
        </p>
      </div>
    </div>
  );
}
