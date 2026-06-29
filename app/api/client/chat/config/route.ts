import { NextResponse } from "next/server";
import { lickyChatStatus } from "@/lib/client/licky-chat";

export async function GET() {
  return NextResponse.json(lickyChatStatus());
}
