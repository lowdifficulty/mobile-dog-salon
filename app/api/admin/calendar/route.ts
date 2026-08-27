import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/scheduling/auth";
import { isStaffCalendarVisibleAppointment } from "@/lib/scheduling/appointment-filters";
import { GROOMERS, SHIFT_HORIZON_MONTHS } from "@/lib/scheduling/groomers";
import { getShiftHorizonEndDate, getTodayPacificDate } from "@/lib/scheduling/slots";
import { readSchedulingData } from "@/lib/scheduling/store";
import { buildVanSlotOccupancy } from "@/lib/scheduling/van-capacity";

export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? getTodayPacificDate();
    const to = searchParams.get("to") ?? getShiftHorizonEndDate(SHIFT_HORIZON_MONTHS);

    const data = await readSchedulingData();
    const appointments = data.appointments.filter((a) =>
      isStaffCalendarVisibleAppointment(a)
    );
    const slots = buildVanSlotOccupancy(data, { from, to });
    const openSlots = slots
      .filter((slot) => slot.status === "open")
      .map((slot) => ({
        date: slot.date,
        time: slot.time,
        displayTime: slot.displayTime,
        van: slot.van,
        groomerId: slot.groomerId,
        groomerName: slot.groomerId ? GROOMERS[slot.groomerId].name : undefined,
      }));

    return NextResponse.json({ appointments, slots, openSlots });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
