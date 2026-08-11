"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EMAIL_TEMPLATE_VARIABLES, type EmailTemplate } from "@/lib/notifications/email-template-types";

const TEST_TO_STORAGE_KEY = "mds-admin-email-test-to";

type AnalyticsSummary = {
  totalSent: number;
  byTemplate: Record<
    string,
    { sent: number; delivered: number; opened: number; clicked: number; bounced: number }
  >;
  recent: {
    id: string;
    templateId: string;
    to: string;
    subject: string;
    sentAt: string;
    openCount: number;
    clickCount: number;
    deliveredAt?: string;
    openedAt?: string;
    clickedAt?: string;
    bouncedAt?: string;
  }[];
  webhook?: {
    configured: boolean;
    webhookId?: string;
    endpoint?: string;
    hasSigningSecret: boolean;
    source: "env" | "runtime" | "none";
  };
};

export default function EmailCampaignsPanel() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftHtml, setDraftHtml] = useState("");
  const [draftEnabled, setDraftEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [templateTestTo, setTemplateTestTo] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0],
    [templates, selectedId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tplRes, statsRes] = await Promise.all([
        fetch("/api/admin/email-templates"),
        fetch("/api/admin/email-analytics"),
      ]);
      if (!tplRes.ok || !statsRes.ok) throw new Error("Unauthorized or load failed");
      const tplData = await tplRes.json();
      const statsData = await statsRes.json();
      const list = (tplData.templates ?? []) as EmailTemplate[];
      setTemplates(list);
      setAnalytics(statsData as AnalyticsSummary);
      if (!selectedId && list[0]) {
        setSelectedId(list[0].id);
        setDraftSubject(list[0].subject);
        setDraftHtml(list[0].html);
        setDraftEnabled(list[0].enabled);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load email settings");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TEST_TO_STORAGE_KEY);
      if (saved) {
        setTestTo(saved);
        setTemplateTestTo(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function persistTestRecipient(email: string) {
    try {
      const trimmed = email.trim();
      if (trimmed) sessionStorage.setItem(TEST_TO_STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }
  }

  function syncTestRecipients(email: string) {
    setTestTo(email);
    setTemplateTestTo(email);
    persistTestRecipient(email);
  }

  useEffect(() => {
    persistTestRecipient(testTo);
  }, [testTo]);

  useEffect(() => {
    if (!selected) return;
    setDraftSubject(selected.subject);
    setDraftHtml(selected.html);
    setDraftEnabled(selected.enabled);
  }, [selected]);

  async function save() {
    if (!selected) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          subject: draftSubject,
          html: draftHtml,
          enabled: draftEnabled,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      setTemplates((prev) =>
        prev.map((t) => (t.id === selected.id ? (data.template as EmailTemplate) : t))
      );
      setMessage("Saved.");
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function runAnalyticsAction(action: "ensure-webhook" | "sync-delivery") {
    setSyncing(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/email-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, limit: 250 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Action failed");
      }
      if (action === "ensure-webhook") {
        setMessage(
          data.created
            ? "Resend webhook connected. New delivery events will update this table."
            : "Resend webhook already connected."
        );
      } else {
        setMessage(
          `Synced from Resend: checked ${data.sync?.checked ?? 0}, updated ${data.sync?.updated ?? 0}.`
        );
      }
      if (data.byTemplate) {
        setAnalytics(data as AnalyticsSummary);
      } else {
        void load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setSyncing(false);
    }
  }

  function focusBulkTestEmailField() {
    const el = document.getElementById("bulk-test-email");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement) el.focus();
  }

  function focusTemplateTestEmailField() {
    const el = document.getElementById("template-test-email");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement) el.focus();
  }

  async function sendTest(
    templateId: string,
    recipientSource: "bulk" | "template" = "bulk"
  ) {
    const to =
      recipientSource === "template" ? templateTestTo.trim() : testTo.trim();
    if (!to) {
      setError(
        recipientSource === "template"
          ? "Enter an email address below to send a test for this template."
          : "Enter a recipient email for test sends."
      );
      if (recipientSource === "template") focusTemplateTestEmailField();
      else focusBulkTestEmailField();
      return;
    }
    setTesting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/email-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, templateId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Test send failed");
      }
      if (templateId === "all") {
        setMessage(
          `Sent ${data.sent ?? 0} test email(s) from team@mobiledog-salon.com${
            data.failed ? ` (${data.failed} failed)` : ""
          }.`
        );
      } else {
        setMessage(`Test email sent from team@mobiledog-salon.com to ${to}.`);
      }
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test send failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-600">Loading email campaigns…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="site-card p-6">
        <h2 className="text-lg font-bold text-brand mb-1">Send test emails</h2>
        <p className="text-sm text-gray-600 mb-4">
          Tests use sample booking data and send from{" "}
          <strong>team@mobiledog-salon.com</strong> with a [TEST] subject prefix. Resend must allow
          that sender on your verified domain. Use the same address in the template editor when
          testing one email at a time.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end max-w-xl">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Send tests to
            </label>
            <input
              id="bulk-test-email"
              type="email"
              value={testTo}
              onChange={(e) => syncTestRecipients(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <button
            type="button"
            disabled={testing}
            onClick={() => void sendTest("all", "bulk")}
            className="site-btn px-5 py-2 text-sm whitespace-nowrap disabled:opacity-50"
          >
            {testing ? "Sending…" : "Send all test emails"}
          </button>
        </div>
      </div>

      <div className="site-card p-6">
        <h2 className="text-lg font-bold text-brand mb-1">Email analytics</h2>
        <p className="text-sm text-gray-600 mb-4">
          <strong>Sent</strong> means Resend accepted the message (mail did go out).{" "}
          <strong>Delivered / Opened / Clicked / Bounced</strong> only update after the Resend
          webhook is connected, or after you sync status from Resend.
        </p>
        {analytics ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <p className="text-sm font-semibold text-gray-800">
                Total sends logged: {analytics.totalSent}
              </p>
              <p className="text-xs text-gray-600 sm:ml-auto">
                Webhook:{" "}
                {analytics.webhook?.configured
                  ? `connected (${analytics.webhook.source})`
                  : "not connected — Delivered stays 0"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                disabled={syncing}
                onClick={() => void runAnalyticsAction("ensure-webhook")}
                className="site-btn px-4 py-2 text-sm disabled:opacity-50"
              >
                {syncing ? "Working…" : "Connect Resend webhook"}
              </button>
              <button
                type="button"
                disabled={syncing}
                onClick={() => void runAnalyticsAction("sync-delivery")}
                className="px-4 py-2 text-sm border border-gray-300 rounded-xl disabled:opacity-50"
              >
                {syncing ? "Working…" : "Sync delivery status"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-2 pr-4">Template</th>
                    <th className="py-2 pr-4">Sent</th>
                    <th className="py-2 pr-4">Delivered</th>
                    <th className="py-2 pr-4">Opened</th>
                    <th className="py-2 pr-4">Clicked</th>
                    <th className="py-2">Bounced</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analytics.byTemplate).map(([id, row]) => (
                    <tr key={id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-mono text-xs">{id}</td>
                      <td className="py-2 pr-4">{row.sent}</td>
                      <td className="py-2 pr-4">{row.delivered}</td>
                      <td className="py-2 pr-4">{row.opened}</td>
                      <td className="py-2 pr-4">{row.clicked}</td>
                      <td className="py-2">{row.bounced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="site-card p-4 lg:col-span-1 space-y-2">
          <h3 className="font-bold text-brand text-sm mb-2">Templates</h3>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedId(t.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm border ${
                selected?.id === t.id
                  ? "border-brand bg-brand/5 font-semibold"
                  : "border-gray-200 hover:border-accent"
              }`}
            >
              {t.label}
              {!t.enabled && (
                <span className="ml-2 text-xs text-amber-700">(off)</span>
              )}
            </button>
          ))}
        </div>

        <div className="site-card p-6 lg:col-span-2 space-y-4">
          {selected ? (
            <>
              <div>
                <h3 className="font-bold text-brand">{selected.label}</h3>
                <p className="text-sm text-gray-600">{selected.description}</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={draftEnabled}
                  onChange={(e) => setDraftEnabled(e.target.checked)}
                />
                Template enabled
              </label>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                <input
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">HTML body</label>
                <textarea
                  value={draftHtml}
                  onChange={(e) => setDraftHtml(e.target.value)}
                  rows={14}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono"
                />
              </div>
              <p className="text-xs text-gray-500">
                Variables:{" "}
                {EMAIL_TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(", ")}
              </p>
              {message ? <p className="text-sm text-green-700">{message}</p> : null}
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="site-btn px-5 py-2 text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save template"}
              </button>
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Send test for this template</p>
                <p className="text-xs text-gray-600">
                  Uses sample booking data and your saved template (save first if you edited subject
                  or body). Sends from <strong>team@mobiledog-salon.com</strong> with a [TEST]
                  subject prefix.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="template-test-email"
                      className="block text-xs font-semibold text-gray-600 mb-1"
                    >
                      Email address
                    </label>
                    <input
                      id="template-test-email"
                      type="email"
                      value={templateTestTo}
                      onChange={(e) => syncTestRecipients(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => void sendTest(selected.id, "template")}
                    disabled={testing || saving}
                    className="site-btn px-5 py-2 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {testing ? "Sending…" : "Send test email"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {analytics?.recent?.length ? (
        <div className="site-card p-6">
          <h3 className="font-bold text-brand mb-3">Recent sends</h3>
          <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
            {analytics.recent.map((row) => (
              <li key={row.id} className="border-b border-gray-100 pb-2">
                <span className="font-mono text-xs text-gray-500">{row.templateId}</span> →{" "}
                {row.to} · {new Date(row.sentAt).toLocaleString()}{" "}
                {row.openCount > 0 && <span className="text-green-700">· opened</span>}
                {row.clickCount > 0 && <span className="text-blue-700">· clicked</span>}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
