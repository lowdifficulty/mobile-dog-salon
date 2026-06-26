import { getQuotedServicePrice } from "@/lib/pricing";
import type { AnalyticsRange } from "@/lib/leads/analytics";
import { funnelStepOrder, type Lead } from "@/lib/leads/types";
import {
  appointmentPacificDate,
  buildDailyRoutePlan,
} from "@/lib/scheduling/daily-route";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

export const ANALYTICS_MARKETING_COST_PER_BOOKING = 15;
export const ANALYTICS_PARKING_MONTHLY = 400;
export const ANALYTICS_SUPPLIES_MONTHLY = 200;
export const ANALYTICS_TRUCK_COUNT = 2;
/** Estimated monthly insurance per van (USD). */
export const ANALYTICS_TRUCK_INSURANCE_MONTHLY_PER_TRUCK = 250;
export const ANALYTICS_PAYROLL_HOURLY_PER_GROOMER = 20;
export const ANALYTICS_EXPENSE_BUFFER_PERCENT = 20;

const DAYS_PER_MONTH = 30;

export interface ExpenseBreakdown {
  gas: number;
  payroll: number;
  insurance: number;
  parking: number;
  supplies: number;
  marketing: number;
  subtotal: number;
  buffer: number;
  total: number;
}

export interface FinancialAnalytics {
  bookedAppointments: number;
  completedAppointments: number;
  estimatedRevenue: number;
  completedRevenue: number;
  pricedBookings: number;
  unpricedBookings: number;
  expenses: ExpenseBreakdown;
  estimatedProfit: number;
  periodDays: number;
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function leadPets(lead: Lead) {
  if (lead.pets?.length) {
    return lead.pets.filter((pet) => pet.petSize);
  }
  if (lead.petSize) {
    return [{ petName: lead.petName ?? "", petSize: lead.petSize }];
  }
  return [];
}

export function getLeadBookedPrice(lead: Lead): number | null {
  if (!lead.service) return null;

  const discountActive = lead.discountActive !== false && !lead.discountSkipped;
  const pets = leadPets(lead);
  if (!pets.length) return null;

  let total = 0;
  let found = false;
  for (const pet of pets) {
    const price = getQuotedServicePrice(pet.petSize, lead.service, discountActive);
    if (price != null) {
      total += price;
      found = true;
    }
  }

  return found ? total : null;
}

function sumLeadRevenue(leads: Lead[]): {
  total: number;
  priced: number;
  unpriced: number;
} {
  let total = 0;
  let priced = 0;
  let unpriced = 0;

  for (const lead of leads) {
    const price = getLeadBookedPrice(lead);
    if (price == null) {
      unpriced += 1;
      continue;
    }
    total += price;
    priced += 1;
  }

  return { total: roundMoney(total), priced, unpriced };
}

export function appointmentsForBookedLeads(
  bookedLeads: Lead[],
  appointments: Appointment[]
): Appointment[] {
  const byId = new Set(
    bookedLeads.map((lead) => lead.appointmentId).filter(Boolean) as string[]
  );
  const matched = new Set<string>();
  const result: Appointment[] = [];

  for (const ap of appointments) {
    if (ap.status !== "confirmed") continue;
    if (byId.has(ap.id)) {
      result.push(ap);
      matched.add(ap.id);
    }
  }

  for (const lead of bookedLeads) {
    if (!lead.appointmentStartAt || !lead.groomerId) continue;
    const ap = appointments.find(
      (candidate) =>
        !matched.has(candidate.id) &&
        candidate.status === "confirmed" &&
        candidate.groomerId === lead.groomerId &&
        candidate.startAt === lead.appointmentStartAt
    );
    if (ap) {
      result.push(ap);
      matched.add(ap.id);
    }
  }

  return result;
}

async function computeGasCostFromRoutes(
  periodAppointments: Appointment[],
  allAppointments: Appointment[]
): Promise<number> {
  if (periodAppointments.length === 0) return 0;

  const dayKeys = new Set<string>();
  for (const ap of periodAppointments) {
    dayKeys.add(`${ap.groomerId}|${appointmentPacificDate(ap.startAt)}`);
  }

  let total = 0;
  for (const key of dayKeys) {
    const [groomerId, date] = key.split("|");
    if (!groomerId || !date) continue;
    try {
      const plan = await buildDailyRoutePlan(
        allAppointments,
        groomerId as GroomerId,
        date
      );
      if (plan) total += plan.totalGasCost;
    } catch (err) {
      console.error("Analytics gas estimate failed for", key, err);
    }
  }

  return roundMoney(total);
}

function computePayrollCost(appointments: Appointment[]): number {
  if (appointments.length === 0) return 0;
  const hours = appointments.reduce((sum, ap) => sum + ap.durationMinutes / 60, 0);
  return roundMoney(hours * ANALYTICS_PAYROLL_HOURLY_PER_GROOMER);
}

function analyticsPeriodDays(leads: Lead[], range: AnalyticsRange): number {
  if (range === "today" || range === "custom") return 1;
  if (range === "week") return 7;
  if (range === "month") return DAYS_PER_MONTH;

  if (range === "all") {
    const contactTimes = leads
      .map((lead) => new Date(lead.contactMadeAt).getTime())
      .filter((ms) => !Number.isNaN(ms));
    if (!contactTimes.length) return DAYS_PER_MONTH;
    const earliest = Math.min(...contactTimes);
    const days = Math.ceil((Date.now() - earliest) / (24 * 60 * 60 * 1000));
    return Math.max(1, days);
  }

  return DAYS_PER_MONTH;
}

function prorateMonthly(monthlyAmount: number, periodDays: number): number {
  return roundMoney((monthlyAmount / DAYS_PER_MONTH) * periodDays);
}

async function computeExpenses(
  periodAppointments: Appointment[],
  allAppointments: Appointment[],
  bookedAppointments: number,
  periodDays: number
): Promise<ExpenseBreakdown> {
  const gas = await computeGasCostFromRoutes(periodAppointments, allAppointments);
  const payroll = computePayrollCost(periodAppointments);
  const insurance = prorateMonthly(
    ANALYTICS_TRUCK_INSURANCE_MONTHLY_PER_TRUCK * ANALYTICS_TRUCK_COUNT,
    periodDays
  );
  const parking = prorateMonthly(ANALYTICS_PARKING_MONTHLY, periodDays);
  const supplies = prorateMonthly(ANALYTICS_SUPPLIES_MONTHLY, periodDays);
  const marketing = roundMoney(bookedAppointments * ANALYTICS_MARKETING_COST_PER_BOOKING);
  const subtotal = roundMoney(
    gas + payroll + insurance + parking + supplies + marketing
  );
  const buffer = roundMoney(subtotal * (ANALYTICS_EXPENSE_BUFFER_PERCENT / 100));
  const total = roundMoney(subtotal + buffer);

  return {
    gas,
    payroll,
    insurance,
    parking,
    supplies,
    marketing,
    subtotal,
    buffer,
    total,
  };
}

export async function computeFinancialAnalytics(
  filteredLeads: Lead[],
  range: AnalyticsRange,
  appointments: Appointment[]
): Promise<FinancialAnalytics> {
  const bookedLeads = filteredLeads.filter(
    (lead) => funnelStepOrder(lead.funnelStep) >= funnelStepOrder("scheduled")
  );
  const completedLeads = filteredLeads.filter(
    (lead) =>
      funnelStepOrder(lead.funnelStep) >= funnelStepOrder("appointment_completed")
  );

  const bookedRevenue = sumLeadRevenue(bookedLeads);
  const completedRevenue = sumLeadRevenue(completedLeads);
  const periodDays = analyticsPeriodDays(filteredLeads, range);
  const periodAppointments = appointmentsForBookedLeads(bookedLeads, appointments);
  const expenses = await computeExpenses(
    periodAppointments,
    appointments,
    bookedLeads.length,
    periodDays
  );

  return {
    bookedAppointments: bookedLeads.length,
    completedAppointments: completedLeads.length,
    estimatedRevenue: bookedRevenue.total,
    completedRevenue: completedRevenue.total,
    pricedBookings: bookedRevenue.priced,
    unpricedBookings: bookedRevenue.unpriced,
    expenses,
    estimatedProfit: roundMoney(bookedRevenue.total - expenses.total),
    periodDays,
  };
}

/** Format USD for analytics cards. */
export function formatAnalyticsMoney(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
