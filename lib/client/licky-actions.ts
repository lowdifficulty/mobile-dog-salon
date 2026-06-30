import "server-only";

import {
  cancelAppointment,
  rescheduleAppointment,
} from "@/lib/scheduling/appointment-actions";
import {
  getClientAppointment,
  listClientAppointments,
  mergeAppointmentIds,
} from "@/lib/client/appointments";
import { LA_COUNTY_SERVICE_AREAS } from "@/lib/client/licky-knowledge";
import { getLickyAvailabilitySlots } from "@/lib/client/licky-availability";
import {
  buildAvailabilityResponse,
  structuredFromText,
  truncateLickyReply,
  type LickyStructuredResponse,
} from "@/lib/client/licky-response";
import {
  createAppointment,
  type AppointmentMutationOptions,
  type CreateAppointmentInput,
} from "@/lib/scheduling/appointment-actions";
import {
  parseClientAddressMessage,
} from "@/lib/client/licky-address";
import {
  formatPrice,
  getListServicePrice,
  getQuotedServicePrice,
  getServiceLabel,
  normalizePetSize,
} from "@/lib/pricing";
import type { GroomerId } from "@/lib/scheduling/types";
import { updateClient } from "@/lib/payments/store";
import { isLocalhostRequest } from "@/lib/dev/is-localhost-request";
import { groomerClientDisplayName } from "@/lib/scheduling/groomers";
import { createSlotHold, SLOT_HOLD_TTL_SECONDS } from "@/lib/scheduling/slot-holds";
import type { LickyActionContext } from "@/lib/client/licky-context";
import {
  clearPendingBooking,
  getNameFromCtx,
  getPendingLickyBooking,
  getPetFromCtx,
  getPhoneFromCtx,
  getServiceAddressFromCtx,
  hasValidContact,
  parseContactMessage,
  saveContactToCtx,
  savePendingBookingToCtx,
  saveServiceAddressToCtx,
} from "@/lib/client/licky-guest-helpers";

export type { LickyActionContext } from "@/lib/client/licky-context";

function lickyBookingOptions(
  request: Request | undefined,
  fromFallback: boolean | undefined,
  holdOwnerId: string
): AppointmentMutationOptions {
  const localhost = request ? isLocalhostRequest(request) : false;
  return {
    overrideAvailability: localhost || Boolean(fromFallback),
    holdOwnerId,
  };
}

function holdMinutesLabel(): string {
  return `${SLOT_HOLD_TTL_SECONDS / 60} min`;
}

async function lickyReserveSlot(
  ctx: LickyActionContext,
  slotKey: string,
  service: string,
  fromFallback?: boolean
): Promise<LickyStructuredResponse | null> {
  const hold = await createSlotHold(ctx.holdOwnerId, slotKey);
  if (!hold.ok) {
    return structuredFromText(hold.error);
  }

  try {
    await savePendingBookingToCtx(ctx, {
      slotKey,
      service,
      fromFallback,
      holdId: hold.holdId,
    });
  } catch (err) {
    console.error("Licky pending booking save failed:", err);
    return structuredFromText("Couldn't save your pick — try again in a moment.");
  }

  return null;
}

const MAX_SLOTS_IN_REPLY = 24;

function formatApptLine(ap: {
  id: string;
  startAt: string;
  service: string;
  petName: string;
  groomerId: string;
  status: string;
}): string {
  const when = new Date(ap.startAt).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `id=${ap.id} | ${when} | ${getServiceLabel(ap.service)} | pet: ${ap.petName || "—"} | groomer: ${groomerClientDisplayName(ap.groomerId as GroomerId)} (${ap.groomerId}) | status: ${ap.status}`;
}

export async function lickyListUpcoming(ctx: LickyActionContext): Promise<string> {
  if (!ctx.loggedIn || !ctx.account) {
    return "Log in at /client/login to see your appointments.";
  }
  const appointments = await listClientAppointments(ctx.account);
  const now = Date.now();
  const upcoming = appointments.filter(
    (ap) => ap.status === "confirmed" && new Date(ap.startAt).getTime() >= now
  );

  if (!upcoming.length) {
    return "No upcoming confirmed appointments on this account.";
  }

  return upcoming.map(formatApptLine).join("\n");
}

export async function lickyBuildAvailabilityResponse(params: {
  service?: string;
  days?: number;
  groomer_id?: string;
  offset?: number;
  holdOwnerId?: string;
}): Promise<LickyStructuredResponse> {
  const groomerFilter = params.groomer_id?.trim().toLowerCase();
  if (
    groomerFilter &&
    groomerFilter !== "melanie" &&
    groomerFilter !== "diamond"
  ) {
    return structuredFromText("Groomer must be Melanie or Diamond.");
  }

  const data = await getLickyAvailabilitySlots({
    service: params.service,
    days: params.days,
    groomerId: groomerFilter || undefined,
    holdOwnerId: params.holdOwnerId,
  });

  return buildAvailabilityResponse(data.slots, {
    offset: params.offset ?? 0,
    service: data.service,
    days: data.days,
    groomerId: data.groomerId,
    fromFallback: data.source === "fallback",
  });
}

export async function lickyBookAppointment(
  ctx: LickyActionContext,
  params: { slot_key: string; service?: string; fromFallback?: boolean },
  request?: Request
): Promise<LickyStructuredResponse> {
  const slotKey = params.slot_key?.trim();
  const service = params.service?.trim() || "full-groom";

  if (!slotKey) {
    return structuredFromText("Pick a time button to book.");
  }

  const savedAddress = await getServiceAddressFromCtx(ctx);
  const { petName, petSize } = getPetFromCtx(ctx);
  const pending = getPendingLickyBooking(ctx);

  if (!pending?.slotKey || pending.slotKey !== slotKey) {
    const reserveErr = await lickyReserveSlot(ctx, slotKey, service, params.fromFallback);
    if (reserveErr) return reserveErr;
  }

  if (!savedAddress) {
    return structuredFromText(
      `Held for ${holdMinutesLabel()}! What's your service address? Street, city, and zip.`
    );
  }

  if (!ctx.loggedIn && !hasValidContact(ctx)) {
    return structuredFromText("Got your address! Your name and mobile number to confirm?");
  }

  const { address, city, zipCode } = savedAddress;
  const { firstName, lastName } = getNameFromCtx(ctx);
  const phone = getPhoneFromCtx(ctx);

  const input: CreateAppointmentInput = {
    slotKey,
    petName,
    petSize,
    service,
    firstName,
    lastName,
    email: ctx.account?.email ?? "",
    phone,
    smsOptIn: true,
    address,
    city,
    zipCode,
    notes: ctx.account?.lockedInDiscount
      ? "50% discount locked in. Booked via Licky chat."
      : "Booked via Licky chat.",
  };

  const actor = ctx.account
    ? `licky:${ctx.account.email}`
    : `licky:guest:${phone || "visitor"}`;

  const result = await createAppointment(
    input,
    actor,
    lickyBookingOptions(request, params.fromFallback, ctx.holdOwnerId)
  );
  if (!result.ok) {
    return structuredFromText(result.error);
  }

  if (ctx.account) {
    await updateClient(ctx.account.id, {
      appointmentIds: mergeAppointmentIds(
        ctx.account.appointmentIds,
        result.appointment.id
      ),
      pendingLickyBooking: null,
    });
  } else {
    await clearPendingBooking(ctx);
  }

  const when = new Date(result.appointment.startAt).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
  });

  const suffix = ctx.loggedIn
    ? " See Appointments tab."
    : " Log in at /client/login to manage visits.";
  return structuredFromText(`Booked! ${when}${suffix}`);
}

export async function lickySaveClientAddress(
  ctx: LickyActionContext,
  params: { full_address?: string; address?: string; city?: string; zip_code?: string }
): Promise<string> {
  let parsed = null;
  if (params.full_address?.trim()) {
    parsed = parseClientAddressMessage(params.full_address);
  } else if (params.address?.trim() && params.city?.trim() && params.zip_code?.trim()) {
    parsed = parseClientAddressMessage(
      `${params.address}, ${params.city}, ${params.zip_code}`
    );
  }

  if (!parsed) {
    return "Need a full address with street, city, and 5-digit zip.";
  }

  await saveServiceAddressToCtx(ctx, parsed);
  return `Saved your address: ${parsed.address}, ${parsed.city} ${parsed.zipCode}.`;
}

export async function lickyCompletePendingBooking(
  ctx: LickyActionContext,
  message: string,
  request?: Request
): Promise<LickyStructuredResponse | null> {
  const pending = getPendingLickyBooking(ctx);
  if (!pending?.slotKey) return null;

  const savedAddress = await getServiceAddressFromCtx(ctx);

  if (!savedAddress) {
    const parsed = parseClientAddressMessage(message);
    if (!parsed) {
      return structuredFromText(
        "Need street, city, and zip. Example: 123 Main St, Irvine, 92618"
      );
    }
    await saveServiceAddressToCtx(ctx, parsed);
    if (!ctx.loggedIn && !hasValidContact(ctx)) {
      return structuredFromText("Got your address! Your name and mobile number to confirm?");
    }
    return lickyBookAppointment(
      ctx,
      {
        slot_key: pending.slotKey,
        service: pending.service,
        fromFallback: pending.fromFallback,
      },
      request
    );
  }

  if (!ctx.loggedIn && !hasValidContact(ctx)) {
    const contact = parseContactMessage(message);
    if (!contact) {
      return structuredFromText("Need your name and a 10-digit mobile number.");
    }
    await saveContactToCtx(ctx, contact);
    return lickyBookAppointment(
      ctx,
      {
        slot_key: pending.slotKey,
        service: pending.service,
        fromFallback: pending.fromFallback,
      },
      request
    );
  }

  return null;
}

export async function lickyCheckAvailability(
  _ctx: LickyActionContext,
  params: {
    service?: string;
    days?: number;
    groomer_id?: string;
  }
): Promise<string> {
  const groomerFilter = params.groomer_id?.trim().toLowerCase();
  if (
    groomerFilter &&
    groomerFilter !== "melanie" &&
    groomerFilter !== "diamond"
  ) {
    return "Groomer id must be 'melanie' or 'diamond'.";
  }

  const { slots, days, service, groomerId, source, persistenceMode } =
    await getLickyAvailabilitySlots({
      service: params.service,
      days: params.days,
      groomerId: groomerFilter || undefined,
      holdOwnerId: _ctx.holdOwnerId,
    });

  if (!slots.length) {
    const groomerNote = groomerId
      ? ` for ${groomerClientDisplayName(groomerId)}`
      : "";
    return `No open booking slots in the next ${days} days${groomerNote} for ${getServiceLabel(service)}. Calendar source: ${source} (${persistenceMode}). Groomers may add hours soon — try another day or groomer.`;
  }

  const lines = slots.slice(0, MAX_SLOTS_IN_REPLY).map(
    (s) =>
      `${s.date} ${s.displayTime} — ${s.groomerName} | slot_key: ${s.slotKey}`
  );

  const more =
    slots.length > MAX_SLOTS_IN_REPLY
      ? `\n…and ${slots.length - MAX_SLOTS_IN_REPLY} more slots. Ask for a specific groomer or date to narrow down.`
      : "";

  const sourceNote =
    source === "fallback"
      ? "\n(Note: showing standard booking windows — groomer live calendar is empty in storage.)"
      : "";

  return `Open slots for ${getServiceLabel(service)} (next ${days} days, ${slots.length} total):\n${lines.join("\n")}${more}${sourceNote}`;
}

export async function lickyGetPricing(
  ctx: LickyActionContext,
  params: { pet_size?: string; service?: string }
): Promise<string> {
  const petSize =
    params.pet_size?.trim() ||
    ctx.account?.petProfile?.pets?.[0]?.petSize ||
    ctx.guest?.petSize ||
    "small";
  const service = params.service?.trim() || "full-groom";
  const tier = normalizePetSize(petSize);
  const list = getListServicePrice(tier, service);
  if (list == null) {
    return "I couldn't find pricing for that size and service. Try small/medium/large and full-groom or bath-brush.";
  }

  const lockedIn = ctx.account?.lockedInDiscount ?? false;
  const discounted = getQuotedServicePrice(tier, service, true);
  const label = getServiceLabel(service);

  if (lockedIn) {
    return `${label} for a ${tier} dog: your locked-in rate is ${formatPrice(discounted ?? list / 2)} (list price ${formatPrice(list)}). This discount stays on your account for future visits.`;
  }

  return `${label} for a ${tier} dog: list price ${formatPrice(list)}. New clients who book with a phone number often get ~50% off (${formatPrice(discounted ?? list / 2)}). Complete registration after your first booking to lock that discount forever.`;
}

export async function lickyCancelAppointment(
  ctx: LickyActionContext,
  params: { appointment_id: string; confirmed?: boolean }
): Promise<string> {
  if (!ctx.loggedIn || !ctx.account) {
    return "Log in at /client/login to cancel an appointment.";
  }
  const appointmentId = params.appointment_id?.trim();
  if (!appointmentId) {
    return "appointment_id is required.";
  }

  const appointment = await getClientAppointment(ctx.account, appointmentId);
  if (!appointment) {
    return "I couldn't find that appointment on your account. Use list_upcoming_appointments to see valid ids.";
  }

  if (appointment.status === "cancelled") {
    return "That appointment is already cancelled.";
  }

  if (!params.confirmed) {
    return `Ready to cancel: ${formatApptLine(appointment)}. Ask the client to confirm, then call again with confirmed=true.`;
  }

  const result = await cancelAppointment(
    appointmentId,
    `licky:client:${ctx.account.email}`
  );

  if (!result.ok) {
    return `Could not cancel: ${result.error}`;
  }

  return `Cancelled successfully: ${formatApptLine(result.appointment)}`;
}

export async function lickyRescheduleAppointment(
  ctx: LickyActionContext,
  params: { appointment_id: string; slot_key: string; confirmed?: boolean }
): Promise<string> {
  if (!ctx.loggedIn || !ctx.account) {
    return "Log in at /client/login to reschedule.";
  }
  const appointmentId = params.appointment_id?.trim();
  const slotKey = params.slot_key?.trim();

  if (!appointmentId || !slotKey) {
    return "appointment_id and slot_key are required. Use check_availability to get slot_key values.";
  }

  const appointment = await getClientAppointment(ctx.account, appointmentId);
  if (!appointment) {
    return "I couldn't find that appointment on your account.";
  }

  if (!params.confirmed) {
    return `Ready to reschedule ${appointmentId} to slot ${slotKey}. Confirm with the client, then call again with confirmed=true.`;
  }

  const result = await rescheduleAppointment(
    appointmentId,
    slotKey,
    `licky:client:${ctx.account.email}`
  );

  if (!result.ok) {
    return `Could not reschedule: ${result.error}`;
  }

  return `Rescheduled successfully:\n${formatApptLine(result.appointment)}`;
}

export async function lickyGetServiceArea(): Promise<string> {
  return [
    "Orange County: we serve the full county (Anaheim, Irvine, Huntington Beach, Laguna, Mission Viejo, San Clemente, and all OC cities on our Locations page).",
    "LA County (select areas): " + LA_COUNTY_SERVICE_AREAS.join(", "),
    "Mobile service — we come to the client's home. Book online or call to confirm a specific address.",
  ].join("\n");
}

export async function executeLickyTool(
  ctx: LickyActionContext,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "list_upcoming_appointments":
      return lickyListUpcoming(ctx);
    case "check_availability":
      return lickyCheckAvailability(ctx, {
        service: typeof args.service === "string" ? args.service : undefined,
        days:
          typeof args.days === "number" && Number.isFinite(args.days)
            ? args.days
            : undefined,
        groomer_id: typeof args.groomer_id === "string" ? args.groomer_id : undefined,
      });
    case "get_pricing":
      return lickyGetPricing(ctx, {
        pet_size: String(args.pet_size ?? ""),
        service: String(args.service ?? ""),
      });
    case "get_service_area":
      return lickyGetServiceArea();
    case "cancel_appointment":
      return lickyCancelAppointment(ctx, {
        appointment_id: String(args.appointment_id ?? ""),
        confirmed: Boolean(args.confirmed),
      });
    case "reschedule_appointment":
      return lickyRescheduleAppointment(ctx, {
        appointment_id: String(args.appointment_id ?? ""),
        slot_key: String(args.slot_key ?? ""),
        confirmed: Boolean(args.confirmed),
      });
    case "book_appointment":
      return truncateLickyReply(
        (
          await lickyBookAppointment(ctx, {
            slot_key: String(args.slot_key ?? ""),
            service: typeof args.service === "string" ? args.service : undefined,
          })
        ).reply
      );
    case "save_client_address":
      return lickySaveClientAddress(ctx, {
        full_address: typeof args.full_address === "string" ? args.full_address : undefined,
        address: typeof args.address === "string" ? args.address : undefined,
        city: typeof args.city === "string" ? args.city : undefined,
        zip_code: typeof args.zip_code === "string" ? args.zip_code : undefined,
      });
    default:
      return `Unknown tool: ${name}`;
  }
}
