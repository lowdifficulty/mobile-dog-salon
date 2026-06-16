import { NextResponse } from "next/server";
import { getSquareClientConfig } from "@/lib/payments/square";

export async function GET() {
  return NextResponse.json(await getSquareClientConfig());
}