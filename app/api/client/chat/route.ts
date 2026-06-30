import { NextResponse } from "next/server";
import {
  createLickyReply,
  lickyChatStatus,
  type ChatMessage,
} from "@/lib/client/licky-chat";
import { lickyCompletePendingBooking } from "@/lib/client/licky-actions";
import { getPendingLickyBooking } from "@/lib/client/licky-guest-helpers";
import { handleLickyClientAction, type LickyClientAction } from "@/lib/client/licky-ui-handler";
import {
  buildLickyContextLines,
  resolveLickyContext,
} from "@/lib/client/licky-session";

export async function POST(request: Request) {
  try {
    const { ctx } = await resolveLickyContext();
    const body = await request.json();
    const action = body.action as LickyClientAction | undefined;

    if (action?.type) {
      const response = await handleLickyClientAction(action, ctx, request);
      return NextResponse.json({ ...response, ...lickyChatStatus() });
    }

    const messages = (body.messages ?? []) as ChatMessage[];
    if (!messages.length || messages[messages.length - 1]?.role !== "user") {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    const lastUserMessage = messages.filter((m) => m.role === "user").pop()?.content ?? "";
    if (getPendingLickyBooking(ctx)?.slotKey && lastUserMessage.trim()) {
      const pendingResponse = await lickyCompletePendingBooking(
        ctx,
        lastUserMessage,
        request
      );
      if (pendingResponse) {
        return NextResponse.json({ ...pendingResponse, ...lickyChatStatus() });
      }
    }

    const context = await buildLickyContextLines(ctx);
    const response = await createLickyReply(messages, context, ctx);

    return NextResponse.json({ ...response, ...lickyChatStatus() });
  } catch (err) {
    console.error("Licky chat error:", err);
    return NextResponse.json(
      {
        error: "Chat failed",
        reply: "Woof! I hit a snag. Try again in a moment.",
      },
      { status: 500 }
    );
  }
}
