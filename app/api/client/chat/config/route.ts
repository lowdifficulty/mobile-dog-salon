import { NextResponse } from "next/server";
import { lickyChatStatus } from "@/lib/client/licky-chat";
import { isLickyIdentified } from "@/lib/client/licky-identify";
import { resolveLickyContext } from "@/lib/client/licky-session";

export async function GET() {
  const { ctx, loggedIn } = await resolveLickyContext();
  return NextResponse.json({
    ...lickyChatStatus(),
    loggedIn,
    identified: isLickyIdentified(ctx),
  });
}
