import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/payments/auth";

export async function GET() {
  const session = await getClientSession();
  if (!session.client) {
    return NextResponse.json({ client: null });
  }
  return NextResponse.json({ client: session.client });
}
