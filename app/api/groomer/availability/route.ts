import { NextResponse } from "next/server";
import { PersistenceNotConfiguredError } from "@/lib/scheduling/persistence";
import { requireGroomer } from "@/lib/scheduling/auth";
import {
  applyGroomerAvailabilitySave,
  availabilitySaveErrorResponse,
} from "@/lib/scheduling/availability-save";
import { appointmentLockedHourSlots } from "@/lib/scheduling/effective-availability";
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
import type { AvailabilityDay } from "@/lib/scheduling/types";

export async function GET(request: Request) {
  try {
    const user = await requireGroomer();
    const { searchParams } = new URL(request.url);
    const vanParam = searchParams.get("van");
    const data = await readSchedulingData();
    const mine = data.availability.filter((a) => a.groomerId === user.groomerId);
    const locked = appointmentLockedHourSlots(user.groomerId!, data.appointments);
    const today = getTodayPacificDate();
    const maxDate = getShiftHorizonEndDate();
    const van = isVanId(vanParam) ? vanParam : vanForGroomer(user.groomerId!);
    const openSlotKeys = buildEditorOpenSlotKeys(data, user.groomerId!, {
      from: today,
      to: maxDate,
      van,
    });
    const slotOccupancy = buildVanSlotOccupancy(data, {
      from: today,
      to: maxDate,
      van,
      groomerId: user.groomerId!,
    });

    return NextResponse.json({
      availability: mine,
      locked,
      openSlotKeys,
      slotOccupancy,
      persistence: getSchedulingPersistenceStatus(),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireGroomer();
    const body = await request.json();
    const incoming = (body.availability ?? []) as AvailabilityDay[];

    const data = await readSchedulingData();
    const { error, sanitized } = applyGroomerAvailabilitySave(
      data,
      user.groomerId!,
      incoming,
      body.van
    );
    if (error) {
      return availabilitySaveErrorResponse(error);
    }

    await writeSchedulingData(data, {
      action: "groomer_save",
      actor: user.email,
      groomerId: user.groomerId!,
    });

    return NextResponse.json({
      success: true,
      count: sanitized.length,
      persistence: getSchedulingPersistenceStatus(),
    });
  } catch (err) {
    if (err instanceof PersistenceNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 503 });
    }
    console.error("Save availability failed:", err);
    return NextResponse.json({ error: "Could not save availability" }, { status: 500 });
  }
}
