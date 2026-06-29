import { NextResponse } from "next/server";
import {
  createLickyReply,
  lickyChatStatus,
  type ChatMessage,
} from "@/lib/client/licky-chat";
import { listClientAppointments } from "@/lib/client/appointments";
import { handleLickyClientAction, type LickyClientAction } from "@/lib/client/licky-ui-handler";
import { requireClient } from "@/lib/payments/auth";
import { findClientById } from "@/lib/payments/store";
import { getServiceLabel } from "@/lib/pricing";
import { groomerClientDisplayName } from "@/lib/scheduling/groomers";
import type { GroomerId } from "@/lib/scheduling/types";

export async function POST(request: Request) {
  try {
    const sessionUser = await requireClient();
    const account = await findClientById(sessionUser.id);
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const action = body.action as LickyClientAction | undefined;

    if (action?.type) {
      const response = await handleLickyClientAction(action, { account });
      return NextResponse.json({ ...response, ...lickyChatStatus() });
    }

    const messages = (body.messages ?? []) as ChatMessage[];
    if (!messages.length || messages[messages.length - 1]?.role !== "user") {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const appointments = await listClientAppointments(account);
    const now = Date.now();
    const upcoming = appointments.filter(
      (ap) =>
        ap.status === "confirmed" && new Date(ap.startAt).getTime() >= now
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

    const response = await createLickyReply(messages, contextLines.join("\n"), {
      account,
    });

    return NextResponse.json({ ...response, ...lickyChatStatus() });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
