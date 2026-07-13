"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShiftAnalyticsSummary } from "@/lib/scheduling/shift-analytics";

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 text-center min-w-[5.5rem]">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand tabular-nums">{value}</p>
    </div>
  );
}

export default function ShiftAnalytics({
  apiBase = "/api/staff/van-capacity",
  refreshKey = 0,
}: {
  apiBase?: string;
  /** Bump after saves to refresh counts. */
  refreshKey?: number;
}) {
  const [analytics, setAnalytics] = useState<ShiftAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(apiBase);
    if (!res.ok) {
      setError(res.status === 401 ? "Session expired." : "Could not load analytics.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setAnalytics(data.analytics ?? null);
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <section className="site-card p-5 mb-4">
        <p className="text-sm text-gray-500">Loading shift analytics…</p>
      </section>
    );
  }

  if (error || !analytics) {
    return (
      <section className="site-card p-5 mb-4">
        <p className="text-sm text-red-600">{error || "Analytics unavailable."}</p>
      </section>
    );
  }

  return (
    <section className="site-card p-5 mb-4">
      <h3 className="text-base font-bold text-brand mb-4">Shift analytics</h3>

      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
          Open van shifts available to reserve
        </p>
        <div className="flex flex-wrap gap-3">
          <StatCell label="Next 7 days" value={analytics.available.days7} />
          <StatCell label="Next 14 days" value={analytics.available.days14} />
          <StatCell label="Next 30 days" value={analytics.available.days30} />
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
          Shifts each groomer is taking
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-4 font-bold">Groomer</th>
                <th className="py-2 px-3 font-bold text-center">7 days</th>
                <th className="py-2 px-3 font-bold text-center">14 days</th>
                <th className="py-2 pl-3 font-bold text-center">30 days</th>
              </tr>
            </thead>
            <tbody>
              {analytics.groomers.map((row) => (
                <tr key={row.groomerId} className="border-b border-gray-50 last:border-0">
                  <td className="py-3 pr-4 font-semibold text-brand">{row.groomerName}</td>
                  <td className="py-3 px-3 text-center font-bold text-brand tabular-nums">
                    {row.days7}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-brand tabular-nums">
                    {row.days14}
                  </td>
                  <td className="py-3 pl-3 text-center font-bold text-brand tabular-nums">
                    {row.days30}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
