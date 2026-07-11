import { NextResponse } from "next/server";
import { PersistenceNotConfiguredError } from "@/lib/scheduling/persistence";
import { requireStaff } from "@/lib/scheduling/auth";
import {
  allocateShiftsFromAppointments,
  vanCapacitySummary,
} from "@/lib/scheduling/van-capacity";
import {
  getSchedulingPersistenceStatus,
  readSchedulingData,
  writeSchedulingData,
} from "@/lib/scheduling/store";

export async function GET() {
  try {
    await requireStaff();
    const data = await readSchedulingData();
    const summary = vanCapacitySummary(data.appointments);
    return NextResponse.json({
      ...summary,
      persistence: getSchedulingPersistenceStatus(),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/** Allocate shift coverage on groomer calendars from confirmed appointments. */
export async function POST(request: Request) {
  try {
    const user = await requireStaff();
    const body = await request.json().catch(() => ({}));
    const action = body.action as string | undefined;

    if (action !== "allocate-from-appointments") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const data = await readSchedulingData();
    const beforeCount = data.availability.length;
    data.availability = allocateShiftsFromAppointments(data);
    const afterCount = data.availability.length;

    await writeSchedulingData(data, {
      action: "groomer_save",
      actor: user.email,
    });

    const summary = vanCapacitySummary(data.appointments);

    return NextResponse.json({
      success: true,
      message: `Shifts allocated from appointments (${beforeCount} → ${afterCount} day rows).`,
      allocatedDays: afterCount,
      ...summary,
      persistence: getSchedulingPersistenceStatus(),
    });
  } catch (err) {
    if (err instanceof PersistenceNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 503 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Van capacity allocate failed:", err);
    return NextResponse.json({ error: "Could not allocate shifts" }, { status: 500 });
  }
}
