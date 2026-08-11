import { NextResponse } from "next/server";
import { getPaymentsPublicConfig } from "@/lib/payments/gateway";

export async function GET() {
  return NextResponse.json(await getPaymentsPublicConfig());
}
