import { NextResponse } from "next/server";

import { PersistenceNotConfiguredError } from "@/lib/scheduling/persistence";

import { requireStaff } from "@/lib/scheduling/auth";
import {
  allocateShiftsFromAppointments,
  reconcileSchedulingData,
  vanCapacitySummary,
} from "@/lib/scheduling/van-capacity";
import { isVanId } from "@/lib/scheduling/vans";
import type { GroomerId } from "@/lib/scheduling/types";

import { shiftAnalyticsSummary } from "@/lib/scheduling/shift-analytics";

import {

  getSchedulingPersistenceStatus,

  readSchedulingData,

  writeSchedulingData,

} from "@/lib/scheduling/store";



export async function GET(request: Request) {
  try {
    const user = await requireStaff();
    const { searchParams } = new URL(request.url);
    const vanParam = searchParams.get("van");
    const van = isVanId(vanParam) ? vanParam : undefined;
    const groomerIdParam = searchParams.get("groomerId");
    const groomerId: GroomerId | undefined =
      groomerIdParam === "melanie" ||
      groomerIdParam === "diamond" ||
      groomerIdParam === "jessica"
        ? groomerIdParam
        : user.role === "groomer"
          ? user.groomerId
          : undefined;

    const data = await readSchedulingData();
    const summary = vanCapacitySummary(data, { van, groomerId });

    return NextResponse.json({
      ...summary,
      van: van ?? "nissan",
      analytics: shiftAnalyticsSummary(data),
      persistence: getSchedulingPersistenceStatus(),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}



/** Re-sync shifts and refresh conflicts / overlaps from current appointments. */

export async function POST(request: Request) {

  try {

    const user = await requireStaff();

    const body = await request.json().catch(() => ({}));

    const action = body.action as string | undefined;



    const data = await readSchedulingData();

    const beforeCount = data.availability.length;



    if (action === "allocate-from-appointments") {

      data.availability = allocateShiftsFromAppointments(data);

    } else if (action === "reconcile") {

      reconcileSchedulingData(data);

    } else {

      return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    }



    const afterCount = data.availability.length;



    await writeSchedulingData(data, {

      action: "groomer_save",

      actor: user.email,

    });



    const summary = vanCapacitySummary(data);



    return NextResponse.json({

      success: true,

      message:

        action === "reconcile"

          ? `Schedule updated (${beforeCount} → ${afterCount} shift day rows). Conflicts and overlaps refreshed.`

          : `Shifts allocated from appointments (${beforeCount} → ${afterCount} day rows).`,

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

    console.error("Van capacity update failed:", err);

    return NextResponse.json({ error: "Could not update schedule" }, { status: 500 });

  }

}

