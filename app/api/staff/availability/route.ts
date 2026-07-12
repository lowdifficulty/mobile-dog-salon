import { NextResponse } from "next/server";
import { PersistenceNotConfiguredError } from "@/lib/scheduling/persistence";
import { requireStaff } from "@/lib/scheduling/auth";
import {
  appointmentLockedHourSlots,
  effectiveAvailability,
  normalizeGroomerAvailabilitySave,
} from "@/lib/scheduling/effective-availability";
import { GROOMERS } from "@/lib/scheduling/groomers";
import {
  getSchedulingPersistenceStatus,
  readSchedulingData,
  writeSchedulingData,
} from "@/lib/scheduling/store";
import { getShiftHorizonEndDate, getTodayPacificDate } from "@/lib/scheduling/slots";
import {
  buildOpenVanSlotKeySet,
  rejectUnavailableGroomerShifts,
} from "@/lib/scheduling/van-capacity";
import type { AvailabilityDay, GroomerId } from "@/lib/scheduling/types";

function isGroomerId(value: string | null): value is GroomerId {
  return value === "melanie" || value === "diamond";
}

export async function GET(request: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(request.url);
    const groomerIdParam = searchParams.get("groomerId");
    const edit = searchParams.get("edit") === "1";

    const data = await readSchedulingData();

    // Editor mode: raw availability + locked hours for one groomer
    if (edit && isGroomerId(groomerIdParam)) {
      const mine = data.availability.filter((a) => a.groomerId === groomerIdParam);
      const locked = appointmentLockedHourSlots(groomerIdParam, data.appointments);
      const today = getTodayPacificDate();
      const maxDate = getShiftHorizonEndDate();
      const openSlotKeys = [...buildOpenVanSlotKeySet(data, { from: today, to: maxDate })];
      return NextResponse.json({
        availability: mine,
        locked,
        openSlotKeys,
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
    const user = await requireStaff();
    const body = await request.json();
    const groomerIdRaw = body.groomerId as string | undefined;
    const incoming = (body.availability ?? []) as AvailabilityDay[];

    if (!groomerIdRaw || !isGroomerId(groomerIdRaw)) {
      return NextResponse.json({ error: "Valid groomerId required" }, { status: 400 });
    }
    const groomerId = groomerIdRaw;

    // Groomers may only edit their own shifts; admins can edit any groomer
    if (user.role === "groomer" && user.groomerId !== groomerId) {
      return NextResponse.json(
        { error: "You can only edit your own shifts" },
        { status: 403 }
      );
    }

    const data = await readSchedulingData();
    const sanitized = normalizeGroomerAvailabilitySave(
      groomerId,
      incoming
        .filter((a) => a.date && Array.isArray(a.times))
        .map((a) => ({
          groomerId,
          date: a.date,
          times: [...new Set(a.times)].sort(),
        }))
    );

    const shiftError = rejectUnavailableGroomerShifts(data, groomerId, sanitized);
    if (shiftError) {
      return NextResponse.json({ error: shiftError }, { status: 409 });
    }

    data.availability = [
      ...data.availability.filter((a) => a.groomerId !== groomerId),
      ...sanitized,
    ];

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
    console.error("Staff save availability failed:", err);
    return NextResponse.json({ error: "Could not save availability" }, { status: 500 });
  }
}
