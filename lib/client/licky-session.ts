import "server-only";

import type { LickyGuestState } from "@/lib/client/licky-guest-types";
import type { LickyActionContext } from "@/lib/client/licky-context";
import { getClientServiceAddress } from "@/lib/client/licky-address";
import { listClientAppointments } from "@/lib/client/appointments";
import { getClientSession } from "@/lib/payments/auth";
import { findClientById } from "@/lib/payments/store";
import type { ClientAccount } from "@/lib/payments/types";
import { getServiceLabel } from "@/lib/pricing";
import { groomerClientDisplayName } from "@/lib/scheduling/groomers";
import { getOrCreateHoldOwnerId } from "@/lib/scheduling/hold-owner";
import type { GroomerId } from "@/lib/scheduling/types";

export async function resolveLickyContext(): Promise<{
  ctx: LickyActionContext;
  loggedIn: boolean;
}> {
  const session = await getClientSession();
  let account: ClientAccount | undefined;

  if (session.client?.id) {
    account = (await findClientById(session.client.id)) ?? undefined;
  }

  const guest: LickyGuestState = session.lickyGuest ?? {};

  const saveGuest = async (patch: Partial<LickyGuestState>) => {
    session.lickyGuest = { ...(session.lickyGuest ?? {}), ...patch };
    await session.save();
  };

  const holdOwnerId = await getOrCreateHoldOwnerId();

  if (account) {
    return {
      loggedIn: true,
      ctx: { account, guest, saveGuest, loggedIn: true, holdOwnerId },
    };
  }

  return {
    loggedIn: false,
    ctx: { guest, saveGuest, loggedIn: false, holdOwnerId },
  };
}

export async function buildLickyContextLines(ctx: LickyActionContext): Promise<string> {
  if (!ctx.loggedIn || !ctx.account) {
    const lines = [
      "Visitor is not logged in.",
      "Answer any questions about Mobile Dog Salon using knowledge and tools.",
      "Book conversationally: find_slot or check_availability → collect address/phone with save_* tools → book_appointment when they confirm.",
      "Use get_booking_status to see what's already known from this chat.",
      "For cancel/reschedule or saved account history, suggest /client/login.",
    ];
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
    return lines.join("\n");
  }

  const account = ctx.account;
  const appointments = await listClientAppointments(account).catch(() => []);
  const now = Date.now();
  const upcoming = appointments.filter(
    (ap) =>
      ap.status === "confirmed" && ap.startAt && new Date(ap.startAt).getTime() >= now
  );

  const contextLines = [
    `Client: ${account.firstName} ${account.lastName}`,
    `Phone: ${account.phone}`,
    `Discount locked in: ${account.lockedInDiscount ? "yes (50% off grooming)" : "no"}`,
  ];

  if (upcoming.length) {
    contextLines.push("Upcoming appointments (use appointment id for cancel/reschedule):");
    for (const ap of upcoming.slice(0, 5)) {
      const when = new Date(ap.startAt).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
      });
      contextLines.push(
        `- id=${ap.id} | ${when} | ${getServiceLabel(ap.service)} | pet: ${ap.petName || "pet"} | groomer: ${groomerClientDisplayName(ap.groomerId as GroomerId)} (${ap.groomerId})`
      );
    }
  }

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
