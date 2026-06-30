import { NextResponse } from "next/server";
import {
  createLickyReply,
  lickyChatStatus,
  type ChatMessage,
} from "@/lib/client/licky-chat";
import { syncConversationToCtx } from "@/lib/client/licky-conversation";
import { handleLickyClientAction, type LickyClientAction } from "@/lib/client/licky-ui-handler";
import {
  buildLickyContextLines,
  resolveLickyContext,
} from "@/lib/client/licky-session";

export async function POST(request: Request) {
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
    await syncConversationToCtx(ctx, messages);

    const context = await buildLickyContextLines(ctx);
    const response = await createLickyReply(messages, context, ctx);

    return NextResponse.json({ ...response, ...lickyChatStatus() });
  } catch (err) {
    console.error("Licky chat error:", err);
    return NextResponse.json(
      {
        error: "Chat failed",
        reply: "Sorry, I hit a snag. Try again or call (949) 755-8994.",
      },
      { status: 500 }
    );
  }
}
