import { NextResponse } from "next/server";
import { PersistenceNotConfiguredError } from "@/lib/scheduling/persistence";
import { requireAdmin, requireStaff } from "@/lib/scheduling/auth";
import {
  applyGroomerAvailabilitySave,
  availabilitySaveErrorResponse,
} from "@/lib/scheduling/availability-save";
import {
  appointmentLockedHourSlots,
  effectiveAvailability,
} from "@/lib/scheduling/effective-availability";
import { GROOMERS } from "@/lib/scheduling/groomers";
import {
  getSchedulingPersistenceStatus,
  readSchedulingData,
  writeSchedulingData,
} from "@/lib/scheduling/store";
import { getShiftHorizonEndDate, getTodayPacificDate } from "@/lib/scheduling/slots";
import {
  buildEditorOpenSlotKeys,
  buildVanSlotOccupancy,
} from "@/lib/scheduling/van-capacity";
import { isVanId, vanForGroomer } from "@/lib/scheduling/vans";
import type { AvailabilityDay, GroomerId } from "@/lib/scheduling/types";

function isGroomerId(value: string | null): value is GroomerId {
  return value === "melanie" || value === "diamond" || value === "jessica";
}

export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const groomerIdParam = searchParams.get("groomerId");
    const edit = searchParams.get("edit") === "1";

    const data = await readSchedulingData();

    if (edit && isGroomerId(groomerIdParam)) {
      const mine = data.availability.filter((a) => a.groomerId === groomerIdParam);
      const locked = appointmentLockedHourSlots(groomerIdParam, data.appointments);
      const today = getTodayPacificDate();
      const maxDate = getShiftHorizonEndDate();
      const vanParam = searchParams.get("van");
      const van = isVanId(vanParam) ? vanParam : vanForGroomer(groomerIdParam);
      const openSlotKeys = buildEditorOpenSlotKeys(data, groomerIdParam, {
        from: today,
        to: maxDate,
        van,
      });
      const slotOccupancy = buildVanSlotOccupancy(data, {
        from: today,
        to: maxDate,
        van,
        groomerId: groomerIdParam,
      });
      return NextResponse.json({
        availability: mine,
        locked,
        openSlotKeys,
        slotOccupancy,
        persistence: getSchedulingPersistenceStatus(),
      });
    }

    let list = effectiveAvailability(data);
    if (isGroomerId(groomerIdParam)) {
      list = list.filter((a) => a.groomerId === groomerIdParam);
    }

    return NextResponse.json({ availability: list });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireAdmin();
    const body = await request.json();
    const groomerIdRaw = body.groomerId as string | undefined;
    const incoming = (body.availability ?? []) as AvailabilityDay[];

    if (!groomerIdRaw || !isGroomerId(groomerIdRaw)) {
      return NextResponse.json({ error: "Valid groomerId required" }, { status: 400 });
    }
    const groomerId = groomerIdRaw;

    const data = await readSchedulingData();
    const { error, sanitized } = applyGroomerAvailabilitySave(
      data,
      groomerId,
      incoming,
      body.van
    );
    if (error) {
      return availabilitySaveErrorResponse(error);
    }

    await writeSchedulingData(data, {
      action: "groomer_save",
      actor: user.email,
      groomerId,
    });

    return NextResponse.json({
      success: true,
      count: sanitized.length,
      groomerId,
      groomerName: GROOMERS[groomerId].name,
      persistence: getSchedulingPersistenceStatus(),
    });
  } catch (err) {
    if (err instanceof PersistenceNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 503 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Admin save availability failed:", err);
    return NextResponse.json({ error: "Could not save availability" }, { status: 500 });
  }
}
