import { NextResponse } from "next/server";
import { recordFunnelView } from "@/lib/leads/store";
import type { FunnelViewSource } from "@/lib/leads/types";

const VALID_SOURCES: FunnelViewSource[] = ["booking_modal", "book_page"];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      leadSessionId?: string;
      source?: FunnelViewSource;
    };

    const sessionId = body.leadSessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: "Session required" }, { status: 400 });
    }

    const source = body.source ?? "book_page";
    if (!VALID_SOURCES.includes(source)) {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    await recordFunnelView(sessionId, source);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Funnel view failed:", err);
    return NextResponse.json({ error: "Could not record view" }, { status: 500 });
  }
}
