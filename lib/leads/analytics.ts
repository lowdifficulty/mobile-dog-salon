import {
  funnelStepOrder,
  LEAD_FUNNEL_STEPS,
  type FunnelView,
  type Lead,
  type LeadFunnelStep,
} from "./types";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

const PACIFIC_TZ = "America/Los_Angeles";

export const FUNNEL_VIEW_STEP_ID = "funnel_view" as const;

export type AnalyticsFunnelStepId = LeadFunnelStep | typeof FUNNEL_VIEW_STEP_ID;

export type AnalyticsRange = "today" | "week" | "month" | "all";

export const ANALYTICS_RANGES: { id: AnalyticsRange; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Past week" },
  { id: "month", label: "Past month" },
  { id: "all", label: "All time" },
];

export interface FunnelStepStat {
  id: AnalyticsFunnelStepId;
  label: string;
  order: number;
  count: number;
  percent: number;
  stepOverStepPercent: number | null;
}

export interface FunnelAnalyticsResult {
  range: AnalyticsRange;
  rangeLabel: string;
  funnelViews: number;
  totalLeads: number;
  steps: FunnelStepStat[];
  scheduledCount: number;
  scheduledPercent: number;
  completedCount: number;
  completedPercent: number;
}

function eventDatePacific(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: PACIFIC_TZ });
}

export function eventInAnalyticsRange(iso: string, range: AnalyticsRange): boolean {
  const eventMs = new Date(iso).getTime();
  if (Number.isNaN(eventMs)) return false;

  if (range === "all") return true;

  if (range === "today") {
    return eventDatePacific(iso) === getTodayPacificDate();
  }

  const dayMs = 24 * 60 * 60 * 1000;
  if (range === "week") return eventMs >= Date.now() - 7 * dayMs;
  if (range === "month") return eventMs >= Date.now() - 30 * dayMs;

  return true;
}

export function leadInAnalyticsRange(lead: Lead, range: AnalyticsRange): boolean {
  return eventInAnalyticsRange(lead.contactMadeAt, range);
}

export function funnelViewInAnalyticsRange(
  view: FunnelView,
  range: AnalyticsRange
): boolean {
  return eventInAnalyticsRange(view.viewedAt, range);
}

function percentOf(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function computeFunnelAnalytics(
  leads: Lead[],
  range: AnalyticsRange,
  funnelViews: FunnelView[] = []
): FunnelAnalyticsResult {
  const filtered = leads.filter((lead) => leadInAnalyticsRange(lead, range));
  const totalLeads = filtered.length;
  const filteredViews = funnelViews.filter((view) =>
    funnelViewInAnalyticsRange(view, range)
  );
  const funnelViewCount = filteredViews.length;
  const baseline = funnelViewCount > 0 ? funnelViewCount : totalLeads;

  const counts = LEAD_FUNNEL_STEPS.map((step) => ({
    ...step,
    count: filtered.filter(
      (lead) => funnelStepOrder(lead.funnelStep) >= step.order
    ).length,
  }));

  const leadSteps: FunnelStepStat[] = counts.map((step, index) => {
    const percent = percentOf(step.count, baseline);
    const prevCount = index === 0 ? baseline : counts[index - 1].count;
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

  const funnelViewStep: FunnelStepStat = {
    id: FUNNEL_VIEW_STEP_ID,
    label: "Funnel Views",
    order: 0,
    count: funnelViewCount,
    percent: funnelViewCount > 0 ? 100 : 0,
    stepOverStepPercent: null,
  };

  const steps =
    funnelViewCount > 0
      ? [
          funnelViewStep,
          ...leadSteps.map((step, index) => {
            const prevCount = index === 0 ? funnelViewCount : leadSteps[index - 1].count;
            return {
              ...step,
              stepOverStepPercent:
                prevCount === 0 ? null : percentOf(step.count, prevCount),
            };
          }),
        ]
      : leadSteps;

  const scheduledCount =
    counts.find((s) => s.id === "scheduled")?.count ?? 0;
  const completedCount =
    counts.find((s) => s.id === "appointment_completed")?.count ?? 0;

  return {
    range,
    rangeLabel: ANALYTICS_RANGES.find((r) => r.id === range)?.label ?? range,
    funnelViews: funnelViewCount,
    totalLeads,
    steps,
    scheduledCount,
    scheduledPercent: percentOf(scheduledCount, baseline),
    completedCount,
    completedPercent: percentOf(completedCount, baseline),
  };
}
