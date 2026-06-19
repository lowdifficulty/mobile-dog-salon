"use client";

import { useCallback, useEffect, useState } from "react";
import type { QaCheckResult, QaDiagnosticReport } from "@/lib/qa/diagnostics";

function statusLabel(status: QaCheckResult["status"]): string {
  if (status === "working") return "Working";
  if (status === "warning") return "Warning";
  return "Not working";
}

function statusClasses(status: QaCheckResult["status"]): string {
  if (status === "working") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "warning") return "bg-amber-100 text-amber-900 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

function overallBanner(report: QaDiagnosticReport): { text: string; className: string } {
  if (report.overall === "working") {
    return {
      text: "All systems working",
      className: "bg-emerald-50 border-emerald-200 text-emerald-900",
    };
  }
  if (report.overall === "warning") {
    return {
      text: "Some checks need attention",
      className: "bg-amber-50 border-amber-200 text-amber-900",
    };
  }
  return {
    text: "Issues detected — review failed checks",
    className: "bg-red-50 border-red-200 text-red-900",
  };
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function QaDiagnosticsPanel() {
  const [report, setReport] = useState<QaDiagnosticReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/qa");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load QA report");
      setReport(data.report ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runNow() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/qa", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Diagnostic run failed");
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading QA diagnostics…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-brand">System QA</h2>
          <p className="text-sm text-gray-600 mt-1">
            Automated checks run daily (~midnight Pacific). Last manual or scheduled run
            results appear below.
          </p>
        </div>
        <button
          type="button"
          onClick={runNow}
          disabled={running}
          className="px-4 py-2 rounded-full text-sm font-semibold bg-brand text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {running ? "Running…" : "Run diagnostics now"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {!report ? (
        <div className="site-card p-8 text-center text-gray-600">
          <p>No QA report yet.</p>
          <p className="text-sm mt-2">Click &ldquo;Run diagnostics now&rdquo; or wait for the daily cron.</p>
        </div>
      ) : (
        <>
          <div className={`rounded-2xl border px-6 py-4 ${overallBanner(report).className}`}>
            <p className="font-bold text-lg">{overallBanner(report).text}</p>
            <p className="text-sm mt-1 opacity-80">
              Last run: {formatWhen(report.ranAt)} PT
              {report.trigger === "cron" ? " (scheduled)" : " (manual)"}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {report.checks.map((check) => (
              <div
                key={check.id}
                className="site-card p-5 border border-gray-100 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-900">{check.label}</h3>
                  <span
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${statusClasses(check.status)}`}
                  >
                    {statusLabel(check.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{check.message}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
