import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/payments/auth";

export async function POST() {
  const session = await getClientSession();
  session.destroy();
  return NextResponse.json({ success: true });
}
