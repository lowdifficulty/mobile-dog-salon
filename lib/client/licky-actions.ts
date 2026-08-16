import "server-only";

import { cancelAppointment } from "@/lib/scheduling/appointment-actions";
import {
  getClientAppointment,
  getAppointmentByPhone,
  listAppointmentsByPhone,
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
import { summarizeBookingReadiness } from "@/lib/client/licky-conversation";
import { formatSlotLine, rankSlotsForPreference } from "@/lib/client/licky-slot-match";
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
import { isLocalhostDevWithoutProductionData } from "@/lib/dev/is-localhost-request";
import { groomerClientDisplayName } from "@/lib/scheduling/groomers";
import { createSlotHold, SLOT_HOLD_TTL_SECONDS } from "@/lib/scheduling/slot-holds";
import type { LickyActionContext } from "@/lib/client/licky-context";
import { applyLickyIdentifiedContact } from "@/lib/client/licky-identify";
import {
  clearPendingBooking,
  getNameFromCtx,
  getPendingLickyBooking,
  getPetFromCtx,
  getPhoneFromCtx,
  getServiceAddressFromCtx,
  hasValidContact,
  parseContactMessage,
  savePendingBookingToCtx,
  saveServiceAddressToCtx,
} from "@/lib/client/licky-guest-helpers";
import { lickyRescheduleAppointment } from "@/lib/client/licky-reschedule";

export { lickyHandleRescheduleTurn, lickyRescheduleAppointment } from "@/lib/client/licky-reschedule";

export type { LickyActionContext } from "@/lib/client/licky-context";

function lickyBookingOptions(
  request: Request | undefined,
  fromFallback: boolean | undefined,
  holdOwnerId: string
): AppointmentMutationOptions {
  const localhostDev = request
    ? isLocalhostDevWithoutProductionData(request)
    : false;
  return {
    overrideAvailability: localhostDev || Boolean(fromFallback),
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

function lickyGroomerFilter(raw: string | undefined): GroomerId | undefined {
  const id = raw?.trim().toLowerCase();
  if (id === "melanie" || id === "diamond" || id === "jessica") return id;
  return undefined;
}

function ctxPhone(ctx: LickyActionContext): string {
  return (ctx.callerPhone || ctx.guest?.phone || ctx.account?.phone || "").trim();
}

async function confirmedAppointmentsForCtx(ctx: LickyActionContext) {
  const byId = new Map<string, Awaited<ReturnType<typeof listAppointmentsByPhone>>[number]>();
  if (ctx.loggedIn && ctx.account) {
    for (const ap of await listClientAppointments(ctx.account)) {
      if (ap.status === "confirmed") byId.set(ap.id, ap);
    }
  }
  const phone = ctxPhone(ctx);
  if (phone) {
    for (const ap of await listAppointmentsByPhone(phone)) {
      if (ap.status === "confirmed") byId.set(ap.id, ap);
    }
  }
  return [...byId.values()].sort((a, b) => a.startAt.localeCompare(b.startAt));
}

async function upcomingAppointmentsForCtx(ctx: LickyActionContext) {
  const now = Date.now();
  return (await confirmedAppointmentsForCtx(ctx)).filter(
    (ap) => new Date(ap.startAt).getTime() >= now
  );
}

async function appointmentForCtx(
  ctx: LickyActionContext,
  appointmentId: string
) {
  if (ctx.loggedIn && ctx.account) {
    const owned = await getClientAppointment(ctx.account, appointmentId);
    if (owned) return owned;
  }
  const phone = ctxPhone(ctx);
  if (!phone) return null;
  return getAppointmentByPhone(phone, appointmentId);
}

function lickyActor(ctx: LickyActionContext): string {
  if (ctx.account?.email) return `licky:client:${ctx.account.email}`;
  const phone = ctxPhone(ctx).replace(/\D/g, "");
  return phone ? `licky:phone:${phone}` : "licky:guest";
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
  const all = await confirmedAppointmentsForCtx(ctx);
  const now = Date.now();
  const upcoming = all.filter((ap) => new Date(ap.startAt).getTime() >= now);
  const past = all
    .filter((ap) => new Date(ap.startAt).getTime() < now)
    .sort((a, b) => b.startAt.localeCompare(a.startAt));

  if (!all.length) {
    if (!ctx.loggedIn && !ctxPhone(ctx)) {
      return "No phone on file yet. Ask for their name and number, or they can log in at /client/login.";
    }
    return "No confirmed appointments (upcoming or past) on this number.";
  }

  const lines: string[] = [];
  if (upcoming.length) {
    lines.push("Upcoming confirmed:");
    lines.push(...upcoming.map(formatApptLine));
  } else {
    lines.push("No upcoming confirmed appointments.");
  }
  if (past.length) {
    lines.push("Past confirmed:");
    lines.push(...past.slice(0, 8).map(formatApptLine));
  }
  return lines.join("\n");
}

export async function lickyBuildAvailabilityResponse(params: {
  service?: string;
  days?: number;
  groomer_id?: string;
  offset?: number;
  holdOwnerId?: string;
}): Promise<LickyStructuredResponse> {
  const groomerFilter = lickyGroomerFilter(params.groomer_id);
  if (params.groomer_id?.trim() && !groomerFilter) {
    return structuredFromText("Groomer must be Melanie, Diamond, or Jessica.");
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
  params: {
    slot_key: string;
    service?: string;
    fromFallback?: boolean;
    full_address?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    pet_name?: string;
    pet_size?: string;
  },
  request?: Request
): Promise<LickyStructuredResponse> {
  const slotKey = params.slot_key?.trim();
  const service = params.service?.trim() || "full-groom";

  if (!slotKey) {
    return structuredFromText("Tell me which time works, or pick a slot from the list.");
  }

  if (params.full_address?.trim()) {
    const parsed = parseClientAddressMessage(params.full_address);
    if (parsed) await saveServiceAddressToCtx(ctx, parsed);
  }

  if (!ctx.loggedIn) {
    const contactFromParams =
      params.first_name?.trim() || params.phone?.trim()
        ? {
            firstName: params.first_name?.trim() || "Guest",
            lastName: params.last_name?.trim() || "",
            phone: params.phone?.trim() || "",
          }
        : null;
    if (contactFromParams?.phone && contactFromParams.phone.replace(/\D/g, "").length >= 10) {
      await applyLickyIdentifiedContact(ctx, contactFromParams);
    }
    if (params.pet_size?.trim()) {
      await ctx.saveGuest?.({
        petSize: normalizePetSize(params.pet_size) || params.pet_size,
      });
    }
    if (params.pet_name?.trim()) {
      await ctx.saveGuest?.({ petName: params.pet_name.trim() });
    }
  }

  const savedAddress = await getServiceAddressFromCtx(ctx);
  const { petName, petSize } = getPetFromCtx(ctx);
  const pending = getPendingLickyBooking(ctx);
  const fromFallback = params.fromFallback ?? pending?.fromFallback;

  if (!pending?.slotKey || pending.slotKey !== slotKey) {
    const reserveErr = await lickyReserveSlot(ctx, slotKey, service, fromFallback);
    if (reserveErr) return reserveErr;
  }

  if (!savedAddress) {
    return structuredFromText(
      `I've held that time for ${holdMinutesLabel()}. What's your service address — street, city, and zip?`
    );
  }

  if (!ctx.loggedIn && !hasValidContact(ctx)) {
    return structuredFromText(
      "Got your address! What name and mobile number should I put on the booking?"
    );
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
    lickyBookingOptions(request, fromFallback, ctx.holdOwnerId)
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

  try {
    const { runBookingFollowUp } = await import("@/lib/scheduling/booking-follow-up");
    await runBookingFollowUp(result.appointment, "booking");
  } catch (err) {
    console.error("Licky booking follow-up failed:", err);
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
  return structuredFromText(`You're all set! ${when}${suffix}`);
}

export async function lickyFindSlot(
  ctx: LickyActionContext,
  params: {
    preference?: string;
    service?: string;
    groomer_id?: string;
    date?: string;
  }
): Promise<{ text: string; slots: Awaited<ReturnType<typeof getLickyAvailabilitySlots>>["slots"]; service: string; fromFallback: boolean }> {
  const groomerFilter = lickyGroomerFilter(params.groomer_id);
  const service = params.service?.trim() || "full-groom";

  const data = await getLickyAvailabilitySlots({
    service,
    days: 14,
    groomerId: groomerFilter,
    holdOwnerId: ctx.holdOwnerId,
  });

  if (!data.slots.length) {
    return {
      text: `No open slots in the next 14 days for ${getServiceLabel(service)}. Try another groomer or service.`,
      slots: [],
      service,
      fromFallback: data.source === "fallback",
    };
  }

  const matched = rankSlotsForPreference(data.slots, {
    preference: params.preference,
    groomerId: groomerFilter,
    date: params.date,
    limit: 5,
  });

  const lines = matched.map(formatSlotLine);
  const pref = params.preference?.trim() ? ` for "${params.preference}"` : "";

  return {
    text: [
      `Best matches${pref} (${matched.length}):`,
      ...lines,
      "Use slot_key with book_appointment when the client confirms a time.",
    ].join("\n"),
    slots: matched,
    service,
    fromFallback: data.source === "fallback",
  };
}

export async function lickyGetBookingStatus(ctx: LickyActionContext): Promise<string> {
  return summarizeBookingReadiness(ctx);
}

export async function lickySaveGuestContact(
  ctx: LickyActionContext,
  params: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    pet_name?: string;
    pet_size?: string;
  }
): Promise<string> {
  if (ctx.loggedIn) {
    return "Client is logged in — name and phone come from their account.";
  }

  const phone = params.phone?.trim() ?? "";
  const firstName = params.first_name?.trim() || ctx.guest?.firstName || "";
  const lastName = params.last_name?.trim() || ctx.guest?.lastName || "";

  if (phone.replace(/\D/g, "").length >= 10) {
    await applyLickyIdentifiedContact(ctx, {
      firstName: firstName || "Guest",
      lastName,
      phone,
    });
  } else if (firstName) {
    await ctx.saveGuest?.({ firstName, lastName });
  }

  const guestPatch: Record<string, string> = {};
  if (params.pet_name?.trim()) guestPatch.petName = params.pet_name.trim();
  if (params.pet_size?.trim()) {
    guestPatch.petSize = normalizePetSize(params.pet_size) || params.pet_size;
  }
  if (Object.keys(guestPatch).length) {
    await ctx.saveGuest?.(guestPatch);
  }

  if (!phone.replace(/\D/g, "").match(/\d{10}/) && !firstName) {
    return "Need at least a name and 10-digit mobile number.";
  }

  return summarizeBookingReadiness(ctx);
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
    await applyLickyIdentifiedContact(ctx, contact);
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

export async function lickyCheckAvailability(
  _ctx: LickyActionContext,
  params: {
    service?: string;
    days?: number;
    groomer_id?: string;
  }
): Promise<string> {
  const groomerFilter = lickyGroomerFilter(params.groomer_id);
  if (params.groomer_id?.trim() && !groomerFilter) {
    return "Groomer id must be 'melanie', 'diamond', or 'jessica'.";
  }

  const { slots, days, service, groomerId, source, persistenceMode } =
    await getLickyAvailabilitySlots({
      service: params.service,
      days: params.days,
      groomerId: groomerFilter,
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
  const appointmentId = params.appointment_id?.trim();
  if (!appointmentId) {
    return "appointment_id is required.";
  }

  const appointment = await appointmentForCtx(ctx, appointmentId);
  if (!appointment) {
    if (!ctx.loggedIn && !ctxPhone(ctx)) {
      return "Log in at /client/login to cancel an appointment.";
    }
    return "I couldn't find that appointment on this number. Use list_upcoming_appointments to see valid ids.";
  }

  if (appointment.status === "cancelled") {
    return "That appointment is already cancelled.";
  }

  if (!params.confirmed) {
    return `Ready to cancel: ${formatApptLine(appointment)}. Ask the client to confirm, then call again with confirmed=true.`;
  }

  const result = await cancelAppointment(appointmentId, lickyActor(ctx), {
    cancelledVia: "licky_chat",
  });

  if (!result.ok) {
    return `Could not cancel: ${result.error}`;
  }

  return `Cancelled successfully: ${formatApptLine(result.appointment)}`;
}

function isTrueFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "true";
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
    case "get_booking_status":
      return lickyGetBookingStatus(ctx);
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
    case "find_slot": {
      const result = await lickyFindSlot(ctx, {
        preference: typeof args.preference === "string" ? args.preference : undefined,
        service: typeof args.service === "string" ? args.service : undefined,
        groomer_id: typeof args.groomer_id === "string" ? args.groomer_id : undefined,
        date: typeof args.date === "string" ? args.date : undefined,
      });
      return result.text;
    }
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
        confirmed: isTrueFlag(args.confirmed),
      });
    case "reschedule_appointment":
      return (
        await lickyRescheduleAppointment(ctx, {
          appointment_id:
            typeof args.appointment_id === "string" ? args.appointment_id : undefined,
          slot_key: typeof args.slot_key === "string" ? args.slot_key : undefined,
          preference: typeof args.preference === "string" ? args.preference : undefined,
          requested_time:
            typeof args.requested_time === "string" ? args.requested_time : undefined,
          date: typeof args.date === "string" ? args.date : undefined,
          confirmed: isTrueFlag(args.confirmed),
        })
      ).reply;
    case "save_guest_contact":
      return lickySaveGuestContact(ctx, {
        first_name: typeof args.first_name === "string" ? args.first_name : undefined,
        last_name: typeof args.last_name === "string" ? args.last_name : undefined,
        phone: typeof args.phone === "string" ? args.phone : undefined,
        pet_name: typeof args.pet_name === "string" ? args.pet_name : undefined,
        pet_size: typeof args.pet_size === "string" ? args.pet_size : undefined,
      });
    case "book_appointment":
      return (
        await lickyBookAppointment(
          ctx,
          {
            slot_key: String(args.slot_key ?? ""),
            service: typeof args.service === "string" ? args.service : undefined,
            full_address:
              typeof args.full_address === "string" ? args.full_address : undefined,
            first_name: typeof args.first_name === "string" ? args.first_name : undefined,
            last_name: typeof args.last_name === "string" ? args.last_name : undefined,
            phone: typeof args.phone === "string" ? args.phone : undefined,
            pet_name: typeof args.pet_name === "string" ? args.pet_name : undefined,
            pet_size: typeof args.pet_size === "string" ? args.pet_size : undefined,
          },
          ctx.request
        )
      ).reply;
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
