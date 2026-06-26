import { getQuotedServicePrice } from "@/lib/pricing";
import type { AnalyticsRange } from "@/lib/leads/analytics";
import { funnelStepOrder, type Lead } from "@/lib/leads/types";
import {
  ROUTE_GAS_MPG,
  ROUTE_GAS_PRICE_PER_GALLON,
} from "@/lib/scheduling/route-depot";
import type { Appointment } from "@/lib/scheduling/types";

/** Average driving miles attributed to each appointment for gas estimates. */
export const ANALYTICS_ESTIMATED_DRIVE_MILES_PER_APPOINTMENT = 11;

export const ANALYTICS_MARKETING_COST_PER_COMPLETED = 12;
export const ANALYTICS_SUPPLIES_MONTHLY = 200;
export const ANALYTICS_TRUCK_COUNT = 2;
/** Estimated monthly insurance per van (USD). */
export const ANALYTICS_TRUCK_INSURANCE_MONTHLY_PER_TRUCK = 250;
export const ANALYTICS_PAYROLL_PER_DOG = 60;
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
  dogsGroomed: number;
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

function countDogsInLeads(leads: Lead[]): number {
  return leads.reduce((sum, lead) => sum + Math.max(1, leadPets(lead).length), 0);
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

function estimateGasCost(appointmentCount: number): number {
  if (appointmentCount === 0) return 0;
  const gallons =
    (appointmentCount * ANALYTICS_ESTIMATED_DRIVE_MILES_PER_APPOINTMENT) / ROUTE_GAS_MPG;
  return roundMoney(gallons * ROUTE_GAS_PRICE_PER_GALLON);
}

function computePayrollCost(dogsGroomed: number): number {
  return roundMoney(dogsGroomed * ANALYTICS_PAYROLL_PER_DOG);
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

function computeExpenses(
  appointmentCount: number,
  dogsGroomed: number,
  completedAppointments: number,
  periodDays: number
): ExpenseBreakdown {
  const gas = estimateGasCost(appointmentCount);
  const payroll = computePayrollCost(dogsGroomed);
  const insurance = prorateMonthly(
    ANALYTICS_TRUCK_INSURANCE_MONTHLY_PER_TRUCK * ANALYTICS_TRUCK_COUNT,
    periodDays
  );
  const parking = 0;
  const supplies = prorateMonthly(ANALYTICS_SUPPLIES_MONTHLY, periodDays);
  const marketing = roundMoney(
    completedAppointments * ANALYTICS_MARKETING_COST_PER_COMPLETED
  );
  const subtotal = roundMoney(gas + payroll + insurance + supplies + marketing);
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

export function computeFinancialAnalytics(
  filteredLeads: Lead[],
  range: AnalyticsRange,
  appointments: Appointment[]
): FinancialAnalytics {
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
  const dogsGroomed = countDogsInLeads(completedLeads);
  const expenses = computeExpenses(
    periodAppointments.length,
    dogsGroomed,
    completedLeads.length,
    periodDays
  );

  return {
    bookedAppointments: bookedLeads.length,
    completedAppointments: completedLeads.length,
    dogsGroomed,
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
