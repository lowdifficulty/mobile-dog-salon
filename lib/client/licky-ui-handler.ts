import "server-only";

import {
  lickyBookAppointment,
  type LickyActionContext,
} from "@/lib/client/licky-actions";
import {
  getPendingLickyReschedule,
  lickyRescheduleAppointment,
} from "@/lib/client/licky-reschedule";
import { getLickyAvailabilitySlots } from "@/lib/client/licky-availability";
import {
  buildAvailabilityResponse,
  structuredFromText,
  type LickyStructuredResponse,
} from "@/lib/client/licky-response";

export interface LickyClientAction {
  type: string;
  payload?: Record<string, unknown>;
}

function payloadString(payload: Record<string, unknown> | undefined, key: string): string {
  const v = payload?.[key];
  return typeof v === "string" ? v.trim() : "";
}

function payloadNumber(payload: Record<string, unknown> | undefined, key: string): number | undefined {
  const v = payload?.[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return undefined;
}

function payloadBoolean(payload: Record<string, unknown> | undefined, key: string): boolean {
  return payload?.[key] === true;
}

export async function buildAvailabilityActionResponse(
  payload?: Record<string, unknown>,
  holdOwnerId?: string
): Promise<LickyStructuredResponse> {
  const service = payloadString(payload, "service") || "full-groom";
  const days = payloadNumber(payload, "days");
  const groomerId = payloadString(payload, "groomerId") || payloadString(payload, "groomer_id");
  const offset = payloadNumber(payload, "offset") ?? 0;

  const data = await getLickyAvailabilitySlots({
    service,
    days,
    groomerId: groomerId || undefined,
    holdOwnerId,
  });

  return buildAvailabilityResponse(data.slots, {
    offset,
    service: data.service,
    days: data.days,
    groomerId: data.groomerId,
    fromFallback: data.source === "fallback",
  });
}

export async function handleLickyClientAction(
  action: LickyClientAction,
  ctx: LickyActionContext,
  request?: Request
): Promise<LickyStructuredResponse> {
  switch (action.type) {
    case "show_availability":
    case "show_more_availability":
      return buildAvailabilityActionResponse(action.payload, ctx.holdOwnerId);

    case "reschedule_slot": {
      const appointmentId = payloadString(action.payload, "appointmentId");
      const slotKey = payloadString(action.payload, "slotKey");
      if (!slotKey) {
        return structuredFromText("Missing slot — tap a time button.");
      }
      return lickyRescheduleAppointment(ctx, {
        appointment_id: appointmentId || undefined,
        slot_key: slotKey,
        confirmed: true,
      });
    }

    case "book_slot": {
      const slotKey = payloadString(action.payload, "slotKey");
      const service = payloadString(action.payload, "service") || "full-groom";
      if (!slotKey) {
        return structuredFromText("Missing slot — tap a time button.");
      }
      const pendingReschedule = getPendingLickyReschedule(ctx);
      if (pendingReschedule) {
        return lickyRescheduleAppointment(ctx, {
          appointment_id: pendingReschedule.appointmentId,
          slot_key: slotKey,
          confirmed: true,
          requested_time: pendingReschedule.requestedClock,
        });
      }
      return lickyBookAppointment(
        ctx,
        {
          slot_key: slotKey,
          service,
          fromFallback: payloadBoolean(action.payload, "fromFallback"),
        },
        request
      );
    }

    default:
      return structuredFromText("Try a button or ask me again!");
  }
}
