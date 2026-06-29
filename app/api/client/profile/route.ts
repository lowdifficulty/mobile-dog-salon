import { NextResponse } from "next/server";
import { clientToSessionUser } from "@/lib/client/portal";
import { requireClient } from "@/lib/payments/auth";
import { findClientById, updateClient } from "@/lib/payments/store";

export async function GET() {
  try {
    const sessionUser = await requireClient();
    const account = await findClientById(sessionUser.id);
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ profile: account, client: clientToSessionUser(account) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUser = await requireClient();
    const body = await request.json();
    const { petProfile, firstName, lastName, phone, clearLickyWelcome } = body as {
      petProfile?: { pets: { petName: string; petSize: string; notes?: string }[]; notes?: string };
      firstName?: string;
      lastName?: string;
      phone?: string;
      clearLickyWelcome?: boolean;
    };

    const updated = await updateClient(sessionUser.id, {
      ...(petProfile !== undefined ? { petProfile } : {}),
      ...(firstName !== undefined ? { firstName: firstName.trim() } : {}),
      ...(lastName !== undefined ? { lastName: lastName.trim() } : {}),
      ...(phone !== undefined ? { phone: phone.trim() } : {}),
      ...(clearLickyWelcome ? { pendingLickyWelcome: false } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const session = await (await import("@/lib/payments/auth")).getClientSession();
    session.client = clientToSessionUser(updated);
    await session.save();

    return NextResponse.json({ profile: updated, client: session.client });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
