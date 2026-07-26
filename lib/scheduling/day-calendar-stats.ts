import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { formatAnalyticsMoney } from "@/lib/analytics/financials";
import { parseSlotFromIso } from "@/lib/scheduling/slots";
import type { Appointment } from "@/lib/scheduling/types";
import type { VanSlotOccupancy } from "@/lib/scheduling/van-capacity";

export interface DayCalendarStats {
  appointmentCount: number;
  vanUtilizationPercent: number;
  estimatedRevenue: number;
  estimatedRevenueDisplay: string;
}

export function appointmentsOnPacificDate(
  appointments: Appointment[],
  date: string
): Appointment[] {
  return appointments.filter(
    (ap) =>
      ap.status === "confirmed" && parseSlotFromIso(ap.startAt).date === date
  );
}

export function computeDayCalendarStats(
  date: string,
  appointments: Appointment[],
  slots: VanSlotOccupancy[]
): DayCalendarStats {
  const dayAppointments = appointmentsOnPacificDate(appointments, date);
  const daySlots = slots.filter((slot) => slot.date === date);
  const totalBlocks = daySlots.length;
  const bookedBlocks = daySlots.filter((slot) => slot.status === "booked").length;

  let estimatedRevenue = 0;
  for (const ap of dayAppointments) {
    estimatedRevenue += getAppointmentBookedPrice(ap) ?? 0;
  }

  const vanUtilizationPercent =
    totalBlocks === 0 ? 0 : Math.round((bookedBlocks / totalBlocks) * 1000) / 10;

  return {
    appointmentCount: dayAppointments.length,
    vanUtilizationPercent,
    estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
    estimatedRevenueDisplay: formatAnalyticsMoney(estimatedRevenue),
  };
}
