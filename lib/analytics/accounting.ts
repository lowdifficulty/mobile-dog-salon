import "server-only";

import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { formatPrice } from "@/lib/pricing";
import {
  ANALYTICS_EXPENSE_BUFFER_PERCENT,
  ANALYTICS_MARKETING_COST_PER_COMPLETED,
  ANALYTICS_PAYROLL_PER_DOG,
  ANALYTICS_SUPPLIES_MONTHLY,
  ANALYTICS_TRUCK_COUNT,
  ANALYTICS_TRUCK_INSURANCE_MONTHLY_PER_TRUCK,
  type ExpenseBreakdown,
} from "@/lib/analytics/financials";
import { countDogsInAppointments, appointmentEnded } from "@/lib/analytics/visits";
import { appointmentPacificDate } from "@/lib/leads/filters";
import { isStaffPastAppointment } from "@/lib/scheduling/appointment-filters";
import {
  ROUTE_GAS_MPG,
  ROUTE_GAS_PRICE_PER_GALLON,
} from "@/lib/scheduling/route-depot";
import type { Appointment } from "@/lib/scheduling/types";
import { getTodayPacificDate } from "@/lib/scheduling/slots";

export interface AccountingLineItem {
  appointmentId: string;
  startAt: string;
  groomerId: string;
  clientName: string;
  petName: string;
  service: string;
  quotedCents: number | null;
  quotedDisplay: string | null;
  isFuture: boolean;
  isPast: boolean;
  isCompleted: boolean;
}

export interface AccountingPeriodReport {
  revenueCents: number;
  revenueDisplay: string;
  expenses: ExpenseBreakdown;
  expensesDisplay: string;
  profitCents: number;
  profitDisplay: string;
  appointmentCount: number;
}

export interface AccountingSummary {
  asOf: string;
  current: AccountingPeriodReport;
  future: AccountingPeriodReport;
  total: AccountingPeriodReport;
  items: AccountingLineItem[];
}

const DAYS_PER_MONTH = 30;
const DRIVE_MILES_PER_APPOINTMENT = 11;

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function accountingExpenses(
  appointmentCount: number,
  dogsGroomed: number,
  completedCount: number,
  periodDays: number
): ExpenseBreakdown {
  const gallons =
    (appointmentCount * DRIVE_MILES_PER_APPOINTMENT) / ROUTE_GAS_MPG;
  const gas = roundMoney(gallons * ROUTE_GAS_PRICE_PER_GALLON);
  const payroll = roundMoney(dogsGroomed * ANALYTICS_PAYROLL_PER_DOG);
  const insurance = roundMoney(
    ((ANALYTICS_TRUCK_INSURANCE_MONTHLY_PER_TRUCK * ANALYTICS_TRUCK_COUNT) /
      DAYS_PER_MONTH) *
      periodDays
  );
  const supplies = roundMoney((ANALYTICS_SUPPLIES_MONTHLY / DAYS_PER_MONTH) * periodDays);
  const marketing = roundMoney(completedCount * ANALYTICS_MARKETING_COST_PER_COMPLETED);
  const subtotal = roundMoney(gas + payroll + insurance + supplies + marketing);
  const buffer = roundMoney(subtotal * (ANALYTICS_EXPENSE_BUFFER_PERCENT / 100));
  const total = roundMoney(subtotal + buffer);
  return { gas, payroll, insurance, parking: 0, supplies, marketing, subtotal, buffer, total };
}

function centsToDisplay(cents: number): string {
  return formatPrice(cents / 100);
}

function monthToDateDays(today: string): number {
  const day = Number(today.split("-")[2]);
  return Math.max(1, Number.isFinite(day) ? day : 1);
}

function remainingMonthDays(today: string): number {
  const [year, month] = today.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Number(today.split("-")[2]);
  return Math.max(1, daysInMonth - day + 1);
}

function totalExpensePeriodDays(today: string, appointments: Appointment[]): number {
  const monthPrefix = today.slice(0, 7);
  let maxDay = monthToDateDays(today);

  for (const appointment of appointments) {
    const apDate = appointmentPacificDate(appointment.startAt);
    if (!apDate.startsWith(monthPrefix)) continue;
    const day = Number(apDate.split("-")[2]);
    if (Number.isFinite(day)) maxDay = Math.max(maxDay, day);
  }

  return Math.max(1, maxDay);
}

function sumRevenueCents(appointments: Appointment[]): number {
  return appointments.reduce((sum, ap) => sum + (quotedCents(ap) ?? 0), 0);
}

function buildPeriodReport(
  appointments: Appointment[],
  periodDays: number,
  marketingCount: number
): AccountingPeriodReport {
  const revenueCents = sumRevenueCents(appointments);
  const dogsGroomed = countDogsInAppointments(appointments);
  const expenses = accountingExpenses(
    appointments.length,
    dogsGroomed,
    marketingCount,
    periodDays
  );
  const profitCents = revenueCents - Math.round(expenses.total * 100);

  return {
    revenueCents,
    revenueDisplay: centsToDisplay(revenueCents),
    expenses,
    expensesDisplay: centsToDisplay(Math.round(expenses.total * 100)),
    profitCents,
    profitDisplay: centsToDisplay(profitCents),
    appointmentCount: appointments.length,
  };
}

function quotedCents(appointment: Appointment): number | null {
  const dollars = getAppointmentBookedPrice(appointment);
  return dollars != null ? Math.round(dollars * 100) : null;
}

function toLineItem(appointment: Appointment, now: Date): AccountingLineItem {
  const quoted = quotedCents(appointment);
  const nowMs = now.getTime();
  const isFuture = new Date(appointment.startAt).getTime() > nowMs;
  const isPast = isStaffPastAppointment(appointment, now);
  const isCompleted = appointment.status === "confirmed" && appointmentEnded(appointment, nowMs);
  return {
    appointmentId: appointment.id,
    startAt: appointment.startAt,
    groomerId: appointment.groomerId,
    clientName: `${appointment.firstName} ${appointment.lastName}`.trim(),
    petName: appointment.petName,
    service: appointment.service,
    quotedCents: quoted,
    quotedDisplay: quoted != null ? centsToDisplay(quoted) : null,
    isFuture,
    isPast,
    isCompleted,
  };
}

export function computeAccountingSummary(
  appointments: Appointment[],
  now: Date = new Date()
): AccountingSummary {
  const today = getTodayPacificDate();
  const nowMs = now.getTime();
  const active = appointments.filter((a) => a.status === "confirmed");
  const items = active
    .map((a) => toLineItem(a, now))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const completed = active.filter((a) => appointmentEnded(a, nowMs));
  const future = active.filter((a) => new Date(a.startAt).getTime() > nowMs);

  const current = buildPeriodReport(completed, monthToDateDays(today), completed.length);
  const futureReport = buildPeriodReport(
    future,
    remainingMonthDays(today),
    0
  );
  const total = buildPeriodReport(
    active,
    totalExpensePeriodDays(today, active),
    completed.length
  );

  return {
    asOf: now.toISOString(),
    current,
    future: futureReport,
    total,
    items,
  };
}
