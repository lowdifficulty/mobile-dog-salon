import { NextResponse } from "next/server";
import { isLickyEnabled } from "@/lib/client/licky-enabled";
import {
  createLickyReply,
  lickyChatStatus,
  type ChatMessage,
} from "@/lib/client/licky-chat";
import { lickyCompletePendingBooking } from "@/lib/client/licky-actions";
import { syncConversationToCtx } from "@/lib/client/licky-conversation";
import { handleLickyClientAction, type LickyClientAction } from "@/lib/client/licky-ui-handler";
import { handleLickyIdentifyGate } from "@/lib/client/licky-identify";
import {
  buildLickyContextLines,
  resolveLickyContext,
} from "@/lib/client/licky-session";

export async function POST(request: Request) {
  if (!isLickyEnabled()) {
    return NextResponse.json(
      {
        error: "Hattie is temporarily unavailable",
        reply: "Our chat assistant is taking a nap. Book at /book or call (949) 755-8994.",
        ...lickyChatStatus(),
      },
      { status: 503 }
    );
  }

  try {
    const { ctx: baseCtx } = await resolveLickyContext();
    const body = await request.json();
    const action = body.action as LickyClientAction | undefined;

    const ctx = { ...baseCtx, request };

    if (action?.type) {
      const response = await handleLickyClientAction(action, ctx, request);
      return NextResponse.json({ ...response, ...lickyChatStatus() });
    }

    const messages = (body.messages ?? []) as ChatMessage[];
    if (!messages.length || messages[messages.length - 1]?.role !== "user") {
      return NextResponse.json({ error: "Invalid messages" }, { status: 400 });
    }

    ctx.conversationMessages = messages;
    const lastUserMessage = messages[messages.length - 1]?.content ?? "";

    const identify = await handleLickyIdentifyGate(ctx, lastUserMessage);
    await syncConversationToCtx(ctx, messages);
    if (identify.kind === "reply") {
      return NextResponse.json({
        reply: identify.reply,
        buttons: [],
        ...lickyChatStatus(),
      });
    }

    const pendingBooking = await lickyCompletePendingBooking(
      ctx,
      lastUserMessage,
      request
    );
    if (pendingBooking) {
      return NextResponse.json({ ...pendingBooking, ...lickyChatStatus() });
    }

    const context = await buildLickyContextLines(ctx);
    const response = await createLickyReply(messages, context, ctx);

    return NextResponse.json({ ...response, ...lickyChatStatus() });
  } catch (err) {
    console.error("Hattie chat error:", err);
    return NextResponse.json(
      {
        error: "Chat failed",
        reply: "Sorry, I hit a snag. Try again or call (949) 755-8994.",
      },
      { status: 500 }
    );
  }
}
