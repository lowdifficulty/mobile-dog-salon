"use client";

import { useCallback, useEffect, useState } from "react";
import { formatAnalyticsMoney } from "@/lib/analytics/financials";
import type { AccountingPeriodReport, AccountingSummary } from "@/lib/analytics/accounting";

type AccountingTab = "current" | "future" | "total";

function ReportSection({
  title,
  report,
  revenueLabel,
  expensesLabel,
  detail,
}: {
  title: string;
  report: AccountingPeriodReport;
  revenueLabel: string;
  expensesLabel: string;
  detail: string;
}) {
  return (
    <div className="site-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-brand">{title}</h3>
          <p className="text-sm text-gray-500 mt-1">{detail}</p>
        </div>
        <p className="text-sm font-semibold text-gray-600">
          Est. net {report.profitDisplay}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
            {revenueLabel}
          </p>
          <p className="text-3xl font-bold text-brand">{report.revenueDisplay}</p>
          <p className="text-sm text-gray-500 mt-1">
            {report.appointmentCount} appointment{report.appointmentCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">
            {expensesLabel}
          </p>
          <p className="text-3xl font-bold text-brand">{report.expensesDisplay}</p>
          <p className="text-sm text-gray-500 mt-1">Gas, payroll, insurance, supplies, marketing</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminAccountingPanel() {
  const [tab, setTab] = useState<AccountingTab>("current");
  const [summary, setSummary] = useState<AccountingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/accounting");
    if (!res.ok) {
      setError("Could not load accounting.");
      setLoading(false);
      return;
    }
    setSummary(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tabs: { id: AccountingTab; label: string }[] = [
    { id: "current", label: "Current" },
    { id: "future", label: "Future" },
    { id: "total", label: "Total" },
  ];

  if (loading) return <p className="text-sm text-gray-500">Loading accounting…</p>;
  if (error || !summary) {
    return <p className="text-sm text-red-600">{error || "Accounting unavailable."}</p>;
  }

  const activeReport =
    tab === "current" ? summary.current : tab === "future" ? summary.future : summary.total;

  const activeItems =
    tab === "current"
      ? summary.items.filter((item) => item.isCompleted)
      : tab === "future"
        ? summary.items.filter((item) => item.isFuture)
        : summary.items;

  const listTitle =
    tab === "current"
      ? "Completed appointments"
      : tab === "future"
        ? "Upcoming appointments"
        : "All confirmed appointments";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand">Accounting</h2>
          <p className="text-sm text-gray-500 mt-1">
            Revenue and estimated expenses from confirmed appointments at booking quote prices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="text-sm font-semibold text-brand hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        <ReportSection
          title="Current"
          report={summary.current}
          revenueLabel="Current revenue"
          expensesLabel="Estimated current expenses"
          detail="Completed appointments and month-to-date overhead."
        />
        <ReportSection
          title="Future"
          report={summary.future}
          revenueLabel="Future revenue"
          expensesLabel="Estimated future expenses"
          detail="Upcoming bookings and estimated costs for the rest of the month."
        />
        <ReportSection
          title="Total"
          report={summary.total}
          revenueLabel="Total revenue"
          expensesLabel="Estimated total expenses"
          detail="All confirmed bookings with full-period expense estimate."
        />
      </div>

      <div className="flex flex-wrap gap-2">
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

      <div className="site-card p-5">
        <p className="text-lg font-bold text-brand">{listTitle}</p>
        <p className="text-sm text-gray-500 mt-1">
          {activeReport.revenueDisplay} revenue · {activeReport.expensesDisplay} estimated expenses
        </p>

        <ul className="mt-5 divide-y divide-gray-100 max-h-[28rem] overflow-y-auto">
          {activeItems.length === 0 ? (
            <li className="py-6 text-sm text-gray-500 text-center">No appointments in this view.</li>
          ) : (
            activeItems.map((item) => (
              <li key={item.appointmentId} className="py-3 flex flex-wrap justify-between gap-2 text-sm">
                <div>
                  <p className="font-semibold text-brand">
                    {new Date(item.startAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/Los_Angeles",
                    })}{" "}
                    · {item.clientName}
                  </p>
                  <p className="text-gray-600">
                    {item.petName} · {item.groomerId} · {item.service}
                  </p>
                </div>
                <p className="font-semibold text-gray-800">{item.quotedDisplay ?? "—"}</p>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="site-card p-5 text-sm text-gray-600">
        <p className="font-semibold text-brand mb-2">
          {tab === "current" ? "Current" : tab === "future" ? "Future" : "Total"} expense breakdown
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <span>Gas: {formatAnalyticsMoney(activeReport.expenses.gas)}</span>
          <span>Payroll: {formatAnalyticsMoney(activeReport.expenses.payroll)}</span>
          <span>Insurance: {formatAnalyticsMoney(activeReport.expenses.insurance)}</span>
          <span>Supplies: {formatAnalyticsMoney(activeReport.expenses.supplies)}</span>
          <span>Marketing: {formatAnalyticsMoney(activeReport.expenses.marketing)}</span>
          <span>Buffer: {formatAnalyticsMoney(activeReport.expenses.buffer)}</span>
        </div>
      </div>
    </div>
  );
}
