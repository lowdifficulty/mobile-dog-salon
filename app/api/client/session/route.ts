import { NextResponse } from "next/server";
import { clientToSessionUser } from "@/lib/client/portal";
import { getClientSession } from "@/lib/payments/auth";
import { findClientById } from "@/lib/payments/store";

export async function GET() {
  const session = await getClientSession();
  if (!session.client) {
    return NextResponse.json({ client: null });
  }

  const account = await findClientById(session.client.id);
  if (!account) {
    return NextResponse.json({ client: null });
  }

  const client = clientToSessionUser(account);
  session.client = client;
  await session.save();

  return NextResponse.json({ client });
}
