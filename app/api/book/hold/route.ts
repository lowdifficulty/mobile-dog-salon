import { NextResponse } from "next/server";
import { getOrCreateHoldOwnerId } from "@/lib/scheduling/hold-owner";
import {
  createSlotHold,
  releaseSlotHold,
  SLOT_HOLD_TTL_SECONDS,
  slotHoldsStatus,
  validateSlotHold,
} from "@/lib/scheduling/slot-holds";
import { parseSlotKey } from "@/lib/scheduling/slots";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slotKey = String(body.slotKey ?? "").trim();

    if (!slotKey) {
      return NextResponse.json({ error: "slotKey is required" }, { status: 400 });
    }

    try {
      parseSlotKey(slotKey);
    } catch {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }

    const ownerId = await getOrCreateHoldOwnerId();
    const result = await createSlotHold(ownerId, slotKey);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({
      holdId: result.holdId,
      slotKey: result.slotKey,
      expiresAt: result.expiresAt,
      ttlSeconds: SLOT_HOLD_TTL_SECONDS,
      holds: slotHoldsStatus(),
    });
  } catch (err) {
    console.error("Slot hold POST error:", err);
    return NextResponse.json({ error: "Could not hold that time" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const slotKey = String(body.slotKey ?? "").trim();
    const ownerId = await getOrCreateHoldOwnerId();

    if (slotKey) {
      await releaseSlotHold(ownerId, slotKey);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Slot hold DELETE error:", err);
    return NextResponse.json({ error: "Could not release hold" }, { status: 500 });
  }
}

export async function GET() {
  const status = slotHoldsStatus();
  return NextResponse.json(status);
}

/** Optional: verify current hold for a slot (used by booking UI). */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const slotKey = String(body.slotKey ?? "").trim();
    if (!slotKey) {
      return NextResponse.json({ error: "slotKey is required" }, { status: 400 });
    }

    const ownerId = await getOrCreateHoldOwnerId();
    const valid = await validateSlotHold(ownerId, slotKey);
    if (!valid.ok) {
      return NextResponse.json({ error: valid.error }, { status: 409 });
    }

    return NextResponse.json({ ok: true, holdId: valid.holdId });
  } catch (err) {
    console.error("Slot hold PUT error:", err);
    return NextResponse.json({ error: "Could not verify hold" }, { status: 500 });
  }
}
