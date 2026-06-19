"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
  type FunnelAnalyticsResult,
} from "@/lib/leads/analytics";

function barTone(percent: number): string {
  if (percent >= 75) return "bg-brand";
  if (percent >= 50) return "bg-brand-bright";
  if (percent >= 25) return "bg-accent";
  return "bg-gray-300";
}

export default function FunnelAnalyticsPanel() {
  const [range, setRange] = useState<AnalyticsRange>("week");
  const [data, setData] = useState<FunnelAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/analytics?range=${range}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load analytics");
        return res.json() as Promise<FunnelAnalyticsResult>;
      })
      .then(setData)
      .catch(() => setError("Could not load funnel analytics."))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-brand">Booking funnel</h2>
          <p className="text-sm text-gray-600 mt-1">
            Share of leads who reached each step in the booking flow.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ANALYTICS_RANGES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setRange(option.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                range === option.id
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-brand border-gray-200 hover:border-accent"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && !data ? (
        <p className="text-sm text-gray-500 py-12 text-center">Loading analytics…</p>
      ) : data ? (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="site-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Leads entered
              </p>
              <p className="text-3xl font-bold text-brand mt-2">{data.totalLeads}</p>
              <p className="text-xs text-gray-500 mt-1">{data.rangeLabel}</p>
            </div>
            <div className="site-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Booked
              </p>
              <p className="text-3xl font-bold text-brand mt-2">
                {data.scheduledPercent}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.scheduledCount} scheduled
              </p>
            </div>
            <div className="site-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Completed visit
              </p>
              <p className="text-3xl font-bold text-brand mt-2">
                {data.completedPercent}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.completedCount} finished
              </p>
            </div>
          </div>

          <div className="site-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-6">
              <h3 className="font-semibold text-gray-900">Step completion</h3>
              <button
                type="button"
                onClick={loadAnalytics}
                className="text-sm font-semibold text-brand hover:text-accent"
              >
                Refresh
              </button>
            </div>

            {data.totalLeads === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No leads in this period yet.
              </p>
            ) : (
              <div className="space-y-4">
                {data.steps.map((step, index) => (
                  <div key={step.id}>
                    <div className="flex flex-wrap items-end justify-between gap-2 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {index + 1}. {step.label}
                        </p>
                        {step.stepOverStepPercent != null && (
                          <p className="text-xs text-gray-500">
                            {step.stepOverStepPercent}% continued from previous step
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-brand">{step.percent}%</p>
                        <p className="text-xs text-gray-500">{step.count} leads</p>
                      </div>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barTone(step.percent)}`}
                        style={{ width: `${Math.max(step.percent, step.count > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Percentages show how many leads in the selected period reached at least each step.
            Dates use Pacific time.
          </p>
        </>
      ) : null}
    </div>
  );
}
