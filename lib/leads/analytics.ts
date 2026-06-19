import {
  funnelStepOrder,
  LEAD_FUNNEL_STEPS,
  type Lead,
  type LeadFunnelStep,
} from "./types";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

const PACIFIC_TZ = "America/Los_Angeles";

export type AnalyticsRange = "today" | "week" | "month" | "all";

export const ANALYTICS_RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Past week" },
  { id: "month", label: "Past month" },
  { id: "all", label: "All time" },
];

export interface FunnelStepStat {
  id: LeadFunnelStep;
  label: string;
  order: number;
  count: number;
  percent: number;
  stepOverStepPercent: number | null;
}

export interface FunnelAnalyticsResult {
  range: AnalyticsRange;
  rangeLabel: string;
  totalLeads: number;
  steps: FunnelStepStat[];
  scheduledCount: number;
  scheduledPercent: number;
  completedCount: number;
  completedPercent: number;
}

function contactDatePacific(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
}

export function leadInAnalyticsRange(lead: Lead, range: AnalyticsRange): boolean {
  const contactMs = new Date(lead.contactMadeAt).getTime();
  if (Number.isNaN(contactMs)) return false;

  if (range === "all") return true;

  if (range === "today") {
    return contactDatePacific(lead.contactMadeAt) === getTodayPacificDate();
  }

  const dayMs = 24 * 60 * 60 * 1000;
  if (range === "week") return contactMs >= Date.now() - 7 * dayMs;
  if (range === "month") return contactMs >= Date.now() - 30 * dayMs;

  return true;
}

export function computeFunnelAnalytics(
  leads: Lead[],
  range: AnalyticsRange
): FunnelAnalyticsResult {
  const filtered = leads.filter((lead) => leadInAnalyticsRange(lead, range));
  const totalLeads = filtered.length;

  const counts = LEAD_FUNNEL_STEPS.map((step) => ({
    ...step,
    count: filtered.filter(
      (lead) => funnelStepOrder(lead.funnelStep) >= step.order
    ).length,
  }));

  const steps: FunnelStepStat[] = counts.map((step, index) => {
    const percent =
      totalLeads === 0 ? 0 : Math.round((step.count / totalLeads) * 1000) / 10;
    const prevCount = index === 0 ? totalLeads : counts[index - 1].count;
    const stepOverStepPercent =
      index === 0 || prevCount === 0
        ? null
        : Math.round((step.count / prevCount) * 1000) / 10;

    return {
      id: step.id,
      label: step.label,
      order: step.order,
      count: step.count,
      percent,
      stepOverStepPercent,
    };
  });

  const scheduledCount =
    counts.find((s) => s.id === "scheduled")?.count ?? 0;
  const completedCount =
    counts.find((s) => s.id === "appointment_completed")?.count ?? 0;

  return {
    range,
    rangeLabel: ANALYTICS_RANGES.find((r) => r.id === range)?.label ?? range,
    totalLeads,
    steps,
    scheduledCount,
    scheduledPercent:
      totalLeads === 0
        ? 0
        : Math.round((scheduledCount / totalLeads) * 1000) / 10,
    completedCount,
    completedPercent:
      totalLeads === 0
        ? 0
        : Math.round((completedCount / totalLeads) * 1000) / 10,
  };
}
