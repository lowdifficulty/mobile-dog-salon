import "server-only";

import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { getAppointmentPets, formatPetsList } from "@/lib/booking/pets";
import { formatPrice } from "@/lib/pricing";
import type { PaymentHistoryItem } from "@/lib/payments/types";
import { appointmentPacificDate } from "@/lib/leads/filters";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";
import { GROOMERS } from "@/lib/scheduling/groomers";
import { GROOMER_ACCOUNTING_IDS } from "@/lib/analytics/groomer-accounting-shared";

export type GroomerPaymentMethod = "card" | "cash";

export interface GroomerAccountingRow {
  appointmentId: string;
  startAt: string;
  clientName: string;
  petSummary: string;
  dogCount: number;
  serviceDollars: number;
  serviceDisplay: string;
  paymentMethod: GroomerPaymentMethod;
  cardAmountDollars: number | null;
  cardAmountDisplay: string | null;
  groomerShareDollars: number;
  groomerShareDisplay: string;
  salonShareDollars: number;
  salonShareDisplay: string;
}

export interface GroomerAccountingSummary {
  groomerId: GroomerId;
  groomerName: string;
  commissionLabel: string;
  periodMonth: string;
  periodLabel: string;
  cardTotalDollars: number;
  cardTotalDisplay: string;
  cashTotalDollars: number;
  cashTotalDisplay: string;
  grossTotalDollars: number;
  grossTotalDisplay: string;
  groomerTotalDollars: number;
  groomerTotalDisplay: string;
  salonTotalDollars: number;
  salonTotalDisplay: string;
  appointmentCount: number;
  cardPaymentCount: number;
  cashPaymentCount: number;
  rows: GroomerAccountingRow[];
}

const JESSICA_GROOMER_SHARE = 0.6;
const MELANIE_SALON_FEE_PER_DOG = 30;

export { GROOMER_ACCOUNTING_IDS, groomerHasAccounting } from "@/lib/analytics/groomer-accounting-shared";

function appointmentIdPrefixFromPaymentNote(note?: string): string | null {
  if (!note) return null;
  const match = note.match(/^Appt ([a-f0-9]{8})/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function indexCardPaymentsByAppointmentPrefix(
  payments: PaymentHistoryItem[]
): Map<string, PaymentHistoryItem> {
  const map = new Map<string, PaymentHistoryItem>();
  for (const payment of payments) {
    const prefix = appointmentIdPrefixFromPaymentNote(payment.note);
    if (!prefix) continue;
    const status = payment.status?.toUpperCase() ?? "";
    if (status !== "COMPLETED" && status !== "SUCCEEDED" && status !== "APPROVED") continue;
    const existing = map.get(prefix);
    if (!existing || payment.createdAt > existing.createdAt) {
      map.set(prefix, payment);
    }
  }
  return map;
}

function dogCountForAppointment(appointment: Appointment): number {
  return Math.max(1, getAppointmentPets(appointment).length);
}

function splitCommission(
  groomerId: GroomerId,
  serviceDollars: number,
  dogCount: number
): { groomerShareDollars: number; salonShareDollars: number } {
  if (groomerId === "jessica") {
    const groomerShareDollars = roundMoney(serviceDollars * JESSICA_GROOMER_SHARE);
    return {
      groomerShareDollars,
      salonShareDollars: roundMoney(serviceDollars - groomerShareDollars),
    };
  }

  if (groomerId === "melanie") {
    const salonShareDollars = roundMoney(dogCount * MELANIE_SALON_FEE_PER_DOG);
    return {
      groomerShareDollars: roundMoney(Math.max(0, serviceDollars - salonShareDollars)),
      salonShareDollars: roundMoney(Math.min(serviceDollars, salonShareDollars)),
    };
  }

  return { groomerShareDollars: 0, salonShareDollars: serviceDollars };
}

function commissionLabel(groomerId: GroomerId): string {
  if (groomerId === "jessica") {
    return "Jessica keeps 60% · Mobile Dog Salon keeps 40%";
  }
  if (groomerId === "melanie") {
    return `Mobile Dog Salon keeps $${MELANIE_SALON_FEE_PER_DOG} per dog · Melanie keeps the rest`;
  }
  return "";
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function formatMonthLabel(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return new Date(year, mon - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

export function computeGroomerAccountingSummary(input: {
  groomerId: GroomerId;
  appointments: Appointment[];
  payments: PaymentHistoryItem[];
  month: string;
}): GroomerAccountingSummary {
  const { groomerId, appointments, payments, month } = input;
  const cardByPrefix = indexCardPaymentsByAppointmentPrefix(payments);

  const rows: GroomerAccountingRow[] = [];
  let cardTotalDollars = 0;
  let cashTotalDollars = 0;
  let groomerTotalDollars = 0;
  let salonTotalDollars = 0;
  let cardPaymentCount = 0;
  let cashPaymentCount = 0;

  const mine = appointments
    .filter(
      (ap) =>
        ap.groomerId === groomerId &&
        ap.status === "confirmed" &&
        appointmentPacificDate(ap.startAt).startsWith(month)
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  for (const appointment of mine) {
    const serviceDollars = getAppointmentBookedPrice(appointment);
    if (serviceDollars == null || serviceDollars <= 0) continue;

    const dogCount = dogCountForAppointment(appointment);
    const cardPayment = cardByPrefix.get(appointment.id.slice(0, 8).toLowerCase());
    const groomerRecorded =
      appointment.paidAmountCents != null && appointment.paidAmountCents > 0;
    const paymentMethod: GroomerPaymentMethod = groomerRecorded
      ? appointment.paidVia === "card"
        ? "card"
        : "cash"
      : cardPayment
        ? "card"
        : "cash";
    const serviceDollarsFromGroomer = groomerRecorded
      ? roundMoney(appointment.paidAmountCents! / 100)
      : serviceDollars;
    const cardAmountDollars = cardPayment
      ? roundMoney(cardPayment.amountCents / 100)
      : groomerRecorded && paymentMethod === "card"
        ? serviceDollarsFromGroomer
        : null;

    const countedDollars = groomerRecorded ? serviceDollarsFromGroomer : serviceDollars;

    if (paymentMethod === "card") {
      cardTotalDollars += countedDollars;
      cardPaymentCount += 1;
    } else {
      cashTotalDollars += countedDollars;
      cashPaymentCount += 1;
    }

    const { groomerShareDollars, salonShareDollars } = splitCommission(
      groomerId,
      countedDollars,
      dogCount
    );
    groomerTotalDollars += groomerShareDollars;
    salonTotalDollars += salonShareDollars;

    rows.push({
      appointmentId: appointment.id,
      startAt: appointment.startAt,
      clientName: `${appointment.firstName} ${appointment.lastName}`.trim(),
      petSummary: formatPetsList(getAppointmentPets(appointment)) || appointment.petName || "Pet",
      dogCount,
      serviceDollars: countedDollars,
      serviceDisplay: formatPrice(countedDollars),
      paymentMethod,
      cardAmountDollars,
      cardAmountDisplay:
        cardAmountDollars != null ? formatPrice(cardAmountDollars) : null,
      groomerShareDollars,
      groomerShareDisplay: formatPrice(groomerShareDollars),
      salonShareDollars,
      salonShareDisplay: formatPrice(salonShareDollars),
    });
  }

  const grossTotalDollars = roundMoney(cardTotalDollars + cashTotalDollars);

  return {
    groomerId,
    groomerName: GROOMERS[groomerId]?.name ?? groomerId,
    commissionLabel: commissionLabel(groomerId),
    periodMonth: month,
    periodLabel: formatMonthLabel(month),
    cardTotalDollars: roundMoney(cardTotalDollars),
    cardTotalDisplay: formatPrice(cardTotalDollars),
    cashTotalDollars: roundMoney(cashTotalDollars),
    cashTotalDisplay: formatPrice(cashTotalDollars),
    grossTotalDollars,
    grossTotalDisplay: formatPrice(grossTotalDollars),
    groomerTotalDollars: roundMoney(groomerTotalDollars),
    groomerTotalDisplay: formatPrice(groomerTotalDollars),
    salonTotalDollars: roundMoney(salonTotalDollars),
    salonTotalDisplay: formatPrice(salonTotalDollars),
    appointmentCount: rows.length,
    cardPaymentCount,
    cashPaymentCount,
    rows,
  };
}
