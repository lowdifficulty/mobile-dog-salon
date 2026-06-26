import {
  BOOKING_FUNNEL_STEPS,
  funnelStepOrder,
  type Lead,
  type LeadFunnelStep,
} from "./types";
import type { FinancialAnalytics } from "@/lib/analytics/financials";
import { computeFinancialAnalytics } from "@/lib/analytics/financials";
import type { Appointment } from "@/lib/scheduling/types";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

const PACIFIC_TZ = "America/Los_Angeles";

export type AnalyticsRange = "today" | "week" | "month" | "all" | "custom";

export const ANALYTICS_RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Past week" },
  { id: "month", label: "Past month" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom day" },
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
  customDate?: string;
  totalLeads: number;
  steps: FunnelStepStat[];
  scheduledCount: number;
  scheduledPercent: number;
  completedCount: number;
  completedPercent: number;
  financials: FinancialAnalytics;
}

function contactDatePacific(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
}

function formatCustomDayLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const labelDate = new Date(Date.UTC(year, month - 1, day, 12));
  return labelDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function isValidAnalyticsDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function leadInAnalyticsRange(
  lead: Lead,
  range: AnalyticsRange,
  customDate?: string
): boolean {
  const contactMs = new Date(lead.contactMadeAt).getTime();
  if (Number.isNaN(contactMs)) return false;

  if (range === "all") return true;

  if (range === "today") {
    return contactDatePacific(lead.contactMadeAt) === getTodayPacificDate();
  }

  if (range === "custom") {
    if (!customDate || !isValidAnalyticsDate(customDate)) return false;
    return contactDatePacific(lead.contactMadeAt) === customDate;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  if (range === "week") return contactMs >= Date.now() - 7 * dayMs;
  if (range === "month") return contactMs >= Date.now() - 30 * dayMs;

  return true;
}

function percentOf(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function computeFunnelAnalytics(
  leads: Lead[],
  range: AnalyticsRange,
  customDate?: string,
  appointments: Appointment[] = []
): FunnelAnalyticsResult {
  const filtered = leads.filter((lead) => leadInAnalyticsRange(lead, range, customDate));
  const totalLeads = filtered.length;

  const counts = BOOKING_FUNNEL_STEPS.map((step) => ({
    ...step,
    count: filtered.filter(
      (lead) => funnelStepOrder(lead.funnelStep) >= step.order
    ).length,
  }));

  const steps: FunnelStepStat[] = counts.map((step, index) => {
    const percent = percentOf(step.count, totalLeads);
    const prevCount = index === 0 ? totalLeads : counts[index - 1].count;
    const stepOverStepPercent =
      index === 0 || prevCount === 0 ? null : percentOf(step.count, prevCount);

    return {
      id: step.id,
      label: step.label,
      order: step.order,
      count: step.count,
      percent,
      stepOverStepPercent,
    };
  });

  const scheduledCount = filtered.filter(
    (lead) => funnelStepOrder(lead.funnelStep) >= funnelStepOrder("scheduled")
  ).length;
  const completedCount = filtered.filter(
    (lead) => funnelStepOrder(lead.funnelStep) >= funnelStepOrder("appointment_completed")
  ).length;

  const financials = computeFinancialAnalytics(filtered, range, appointments);

  return {
    range,
    rangeLabel:
      range === "custom" && customDate
        ? formatCustomDayLabel(customDate)
        : (ANALYTICS_RANGES.find((r) => r.id === range)?.label ?? range),
    customDate: range === "custom" ? customDate : undefined,
    totalLeads,
    steps,
    scheduledCount,
    scheduledPercent: percentOf(scheduledCount, totalLeads),
    completedCount,
    completedPercent: percentOf(completedCount, totalLeads),
    financials,
  };
}
