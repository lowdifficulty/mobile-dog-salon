import type { AnalyticsRange } from "@/lib/leads/analytics";
import { SHIFT_HORIZON_MONTHS } from "@/lib/scheduling/groomers";
import { buildVanSlotOccupancy } from "@/lib/scheduling/van-capacity";
import {
  addDays,
  getShiftHorizonEndDate,
  getTodayPacificDate,
} from "@/lib/scheduling/slots";
import type { SchedulingData } from "@/lib/scheduling/types";
import { VAN_IDS, vanLabel, type VanId } from "@/lib/scheduling/vans";

export interface VanUtilizationStats {
  vanId: VanId;
  vanLabel: string;
  totalBlocks: number;
  availableCount: number;
  groomerReservedCount: number;
  bookedCount: number;
  availablePercent: number;
  groomerReservedPercent: number;
  bookedPercent: number;
}

export interface VanUtilizationTotals {
  totalBlocks: number;
  availableCount: number;
  groomerReservedCount: number;
  bookedCount: number;
  availablePercent: number;
  groomerReservedPercent: number;
  bookedPercent: number;
}

export interface VanUtilizationAnalytics {
  from: string;
  to: string;
  vans: VanUtilizationStats[];
  totals: VanUtilizationTotals;
}

function percentOf(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export function analyticsSlotDateRange(
  range: AnalyticsRange,
  customDate?: string
): { from: string; to: string } {
  const today = getTodayPacificDate();

  if (range === "today") return { from: today, to: today };
  if (range === "custom" && customDate) return { from: customDate, to: customDate };
  if (range === "week") return { from: addDays(today, -6), to: today };
  if (range === "month") return { from: addDays(today, -29), to: today };

  return {
    from: addDays(today, -89),
    to: getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS),
  };
}

function emptyCounts(): Record<VanId, { open: number; groomer: number; booked: number }> {
  return {
    nissan: { open: 0, groomer: 0, booked: 0 },
    dodge: { open: 0, groomer: 0, booked: 0 },
    ford: { open: 0, groomer: 0, booked: 0 },
  };
}

function sumCounts(
  counts: Record<VanId, { open: number; groomer: number; booked: number }>
): VanUtilizationTotals {
  let open = 0;
  let groomer = 0;
  let booked = 0;
  for (const vanId of VAN_IDS) {
    open += counts[vanId].open;
    groomer += counts[vanId].groomer;
    booked += counts[vanId].booked;
  }
  const total = open + groomer + booked;
  return {
    totalBlocks: total,
    availableCount: open,
    groomerReservedCount: groomer,
    bookedCount: booked,
    availablePercent: percentOf(open, total),
    groomerReservedPercent: percentOf(groomer, total),
    bookedPercent: percentOf(booked, total),
  };
}

export function computeVanUtilizationAnalytics(
  data: SchedulingData,
  range: AnalyticsRange,
  customDate?: string
): VanUtilizationAnalytics {
  const { from, to } = analyticsSlotDateRange(range, customDate);
  const slots = buildVanSlotOccupancy(data, { from, to });
  const counts = emptyCounts();

  for (const slot of slots) {
    if (slot.status === "open") counts[slot.van].open += 1;
    else if (slot.status === "groomer") counts[slot.van].groomer += 1;
    else if (slot.status === "booked") counts[slot.van].booked += 1;
  }

  const vans: VanUtilizationStats[] = VAN_IDS.map((vanId) => {
    const row = counts[vanId];
    const total = row.open + row.groomer + row.booked;
    return {
      vanId,
      vanLabel: vanLabel(vanId),
      totalBlocks: total,
      availableCount: row.open,
      groomerReservedCount: row.groomer,
      bookedCount: row.booked,
      availablePercent: percentOf(row.open, total),
      groomerReservedPercent: percentOf(row.groomer, total),
      bookedPercent: percentOf(row.booked, total),
    };
  });

  return {
    from,
    to,
    vans,
    totals: sumCounts(counts),
  };
}
