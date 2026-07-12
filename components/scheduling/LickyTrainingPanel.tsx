"use client";

import { useCallback, useEffect, useState } from "react";
import { LICKY_CUSTOM_TEXT_MAX } from "@/lib/client/licky-config-constants";

interface TrainingDumpSummary {
  generatedAt: string;
  customTrainingText?: string;
  customTrainingUpdatedAt?: string;
  calendarStats: {
    openSlotsNext14Days: {
      fullGroom: number;
      bathBrush: number;
      melanieFullGroom: number;
      diamondFullGroom: number;
      source: string;
      persistenceMode: string;
    };
    availabilityDayRecords: number;
    confirmedAppointments: number;
  };
  persistence: { mode: string; message: string };
}

export default function LickyTrainingPanel() {
  const [data, setData] = useState<TrainingDumpSummary | null>(null);
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSaveMessage("");
    try {
      const res = await fetch("/api/admin/licky-training");
      if (!res.ok) throw new Error("Could not load Licky training data");
      const json = (await res.json()) as TrainingDumpSummary;
      setData(json);
      setCustomText(json.customTrainingText ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveCustomText() {
    setSaving(true);
    setError("");
    setSaveMessage("");
    try {
      const res = await fetch("/api/admin/licky-training", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customTrainingText: customText }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Could not save");
      }
      setSaveMessage("Saved — Licky will use this text immediately.");
      setCustomText(json.customTrainingText ?? customText);
      setData((prev) =>
        prev
          ? {
              ...prev,
              customTrainingText: json.customTrainingText,
              customTrainingUpdatedAt: json.customTrainingUpdatedAt,
            }
          : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading Licky training export…</p>;
  }

  if (error && !data) {
    return (
      <div className="site-card p-6">
        <p className="text-red-600 text-sm">{error}</p>
        <button type="button" onClick={() => void load()} className="site-btn mt-4">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const slots = data.calendarStats.openSlotsNext14Days;
  const charCount = customText.length;

  return (
    <div className="space-y-6">
      <div className="site-card p-6 space-y-4">
        <div>
          <h2 className="font-bold text-brand text-lg">Custom Licky training text</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add company background, how Licky should behave, tone, policies, and anything else he
            should know. This is included in every chat and in JSON/Markdown exports.
          </p>
        </div>

        <textarea
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          rows={14}
          placeholder="Example: Mobile Dog Salon started in… Licky should always mention our cage-free approach… Never promise same-day bookings…"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-y min-h-[200px] font-mono leading-relaxed"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {charCount.toLocaleString()} / {LICKY_CUSTOM_TEXT_MAX.toLocaleString()} characters
            {data.customTrainingUpdatedAt && (
              <span className="ml-2">
                · Last saved {new Date(data.customTrainingUpdatedAt).toLocaleString()}
              </span>
            )}
          </p>
          <button
            type="button"
            disabled={saving || charCount > LICKY_CUSTOM_TEXT_MAX}
            onClick={() => void saveCustomText()}
            className="site-btn"
          >
            {saving ? "Saving…" : "Save custom text"}
          </button>
        </div>

        {saveMessage && <p className="text-sm text-brand font-semibold">{saveMessage}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="site-card p-6 space-y-4">
        <div>
          <h2 className="font-bold text-brand text-lg">Licky training export</h2>
          <p className="text-sm text-gray-600 mt-1">
            Download the full dump: live calendar, pricing, FAQs, groomers, your custom text above,
            and sample tool outputs.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-gray-500">Calendar storage</p>
            <p className="font-semibold text-gray-900">{data.persistence.mode}</p>
            <p className="text-xs text-gray-500 mt-1">{data.persistence.message}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-gray-500">Open slots (next 14 days)</p>
            <p className="font-semibold text-gray-900">
              {slots.fullGroom} full groom · {slots.bathBrush} bath
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Melanie {slots.melanieFullGroom} · Diamond {slots.diamondFullGroom} · source:{" "}
              {slots.source}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-gray-500">Availability records</p>
            <p className="font-semibold text-gray-900">
              {data.calendarStats.availabilityDayRecords} groomer-day entries
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-gray-500">Confirmed appointments</p>
            <p className="font-semibold text-gray-900">{data.calendarStats.confirmedAppointments}</p>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          Snapshot generated: {new Date(data.generatedAt).toLocaleString()}
        </p>

        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/licky-training?format=json-download"
            className="site-btn !no-underline"
            download
          >
            Download JSON
          </a>
          <a
            href="/api/admin/licky-training?format=markdown"
            className="px-4 py-2 rounded-full text-sm font-semibold border border-brand text-brand hover:bg-brand/5"
            download
          >
            Download Markdown
          </a>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm font-semibold text-gray-600 underline"
          >
            Refresh snapshot
          </button>
        </div>
      </div>
    </div>
  );
}
