import "server-only";

import type { LickyGuestState } from "@/lib/client/licky-guest-types";
import type { LickyActionContext } from "@/lib/client/licky-context";
import { getClientServiceAddress } from "@/lib/client/licky-address";
import { listAppointmentsByPhone, listClientAppointments } from "@/lib/client/appointments";
import { getClientSession } from "@/lib/payments/auth";
import { findClientById } from "@/lib/payments/store";
import type { ClientAccount } from "@/lib/payments/types";
import { getServiceLabel } from "@/lib/pricing";
import { groomerClientDisplayName } from "@/lib/scheduling/groomers";
import { getOrCreateHoldOwnerId } from "@/lib/scheduling/hold-owner";
import type { Appointment, GroomerId } from "@/lib/scheduling/types";

export async function resolveLickyContext(): Promise<{
  ctx: LickyActionContext;
  loggedIn: boolean;
}> {
  const session = await getClientSession();
  let account: ClientAccount | undefined;

  if (session.client?.id) {
    account = (await findClientById(session.client.id)) ?? undefined;
  }

  const guest: LickyGuestState = { ...(session.lickyGuest ?? {}) };

  const saveGuest = async (patch: Partial<LickyGuestState>) => {
    Object.assign(guest, patch);
    session.lickyGuest = { ...guest };
    await session.save();
  };

  const holdOwnerId = await getOrCreateHoldOwnerId();
  const callerPhone = (account?.phone || guest.phone || "").trim() || undefined;

  if (account) {
    return {
      loggedIn: true,
      ctx: { account, guest, saveGuest, loggedIn: true, holdOwnerId, callerPhone },
    };
  }

  return {
    loggedIn: false,
    ctx: { guest, saveGuest, loggedIn: false, holdOwnerId, callerPhone },
  };
}

function formatApptContextLine(ap: Appointment): string {
  const when = new Date(ap.startAt).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });
  return `- id=${ap.id} | ${when} | ${getServiceLabel(ap.service)} | pet: ${ap.petName || "pet"} | groomer: ${groomerClientDisplayName(ap.groomerId as GroomerId)} (${ap.groomerId})`;
}

function appendAppointmentContext(lines: string[], appointments: Appointment[]): void {
  const now = Date.now();
  const confirmed = appointments.filter((ap) => ap.status === "confirmed" && ap.startAt);
  const upcoming = confirmed
    .filter((ap) => new Date(ap.startAt).getTime() >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const past = confirmed
    .filter((ap) => new Date(ap.startAt).getTime() < now)
    .sort((a, b) => b.startAt.localeCompare(a.startAt));

  if (upcoming.length) {
    lines.push("Upcoming confirmed appointments (use appointment id for cancel/reschedule):");
    for (const ap of upcoming.slice(0, 5)) {
      lines.push(formatApptContextLine(ap));
    }
  } else {
    lines.push("No upcoming confirmed appointments on this number.");
  }
  if (past.length) {
    lines.push("Past confirmed appointments:");
    for (const ap of past.slice(0, 5)) {
      lines.push(formatApptContextLine(ap));
    }
  }
}

export async function buildLickyContextLines(ctx: LickyActionContext): Promise<string> {
  const callerPhone = (ctx.callerPhone || ctx.guest?.phone || "").trim();

  if (!ctx.loggedIn || !ctx.account) {
    const lines = [
      callerPhone
        ? `Visitor is calling or chatting from ${callerPhone}. Name and phone are already collected — do not ask again. Use list_upcoming_appointments for visits (digit-normalized phone match).`
        : ctx.guest?.skippedIdentify
          ? "Visitor skipped the name/phone gate. Help with general questions. Do not block them. Ask for a phone only if they want appointment lookup."
          : "Visitor is not logged in.",
      "Answer any questions about Mobile Dog Salon using knowledge and tools.",
      "Book conversationally: find_slot or check_availability → collect address/phone with save_* tools → book_appointment when they confirm.",
      "Use get_booking_status to see what's already known from this chat.",
      callerPhone
        ? "Cancel and reschedule are allowed using this phone number after they confirm."
        : "For cancel/reschedule without a phone on file, suggest /client/login.",
    ];
    if (ctx.guest?.firstName) {
      lines.push(`Guest name: ${ctx.guest.firstName} ${ctx.guest.lastName || ""}`.trim());
    }
    if (ctx.guest?.serviceAddress) {
      lines.push(
        `Guest address: ${ctx.guest.serviceAddress.address}, ${ctx.guest.serviceAddress.city} ${ctx.guest.serviceAddress.zipCode}`
      );
    }
    if (ctx.guest?.pendingLickyBooking?.slotKey) {
      lines.push(
        `Waiting to finish booking slot ${ctx.guest.pendingLickyBooking.slotKey} (${ctx.guest.pendingLickyBooking.service}).`
      );
    }
    if (callerPhone) {
      const byPhone = await listAppointmentsByPhone(callerPhone).catch(() => []);
      appendAppointmentContext(lines, byPhone);
    }
    return lines.join("\n");
  }

  const account = ctx.account;
  const appointments = await listClientAppointments(account).catch(() => []);

  const contextLines = [
    `Client: ${account.firstName} ${account.lastName}`,
    `Phone: ${account.phone}`,
    "Name and phone are on file — do not ask again. Use list_upcoming_appointments for visits.",
    `Discount locked in: ${account.lockedInDiscount ? "yes (50% off grooming)" : "no"}`,
  ];

  appendAppointmentContext(contextLines, appointments);

  if (account.petProfile?.pets?.length) {
    contextLines.push(
      `Pets on file: ${account.petProfile.pets
        .map((p) => `${p.petName || "pet"} (${p.petSize || "size unknown"})`)
        .join(", ")}`
    );
  }
  if (account.petProfile?.notes) {
    contextLines.push(`Pet notes: ${account.petProfile.notes}`);
  }

  const serviceAddress = getClientServiceAddress(account, appointments);
  if (serviceAddress) {
    contextLines.push(
      `Service address on file: ${serviceAddress.address}, ${serviceAddress.city} ${serviceAddress.zipCode}`
    );
  } else {
    contextLines.push(
      "Service address: not on file — ask for street, city, and zip before booking."
    );
  }

  const pending = account.pendingLickyBooking;
  if (pending?.slotKey) {
    contextLines.push(
      `Waiting for address to book slot ${pending.slotKey} (${pending.service}).`
    );
  }

  return contextLines.join("\n");
}
