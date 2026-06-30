import "server-only";

import OpenAI from "openai";
import {
  executeLickyTool,
  lickyBuildAvailabilityResponse,
  type LickyActionContext,
} from "@/lib/client/licky-actions";
import { getPendingLickyBooking } from "@/lib/client/licky-guest-helpers";
import { buildLickyKnowledgeBlock } from "@/lib/client/licky-knowledge";
import { getLickyCustomTrainingText } from "@/lib/client/licky-config-store";
import { LICKY_TOOLS } from "@/lib/client/licky-tools";
import {
  structuredFromText,
  truncateLickyReply,
  type LickyButton,
  type LickyStructuredResponse,
} from "@/lib/client/licky-response";

const LICKY_SYSTEM_PROMPT = `You are Licky, friendly tan Chihuahua mascot for Mobile Dog Salon (Orange County + parts of LA County).

CRITICAL: Every reply must be 100 characters or fewer. Be quick and to the point.

When the client wants an appointment or open times, call check_availability immediately — show slot buttons first. Do not ask extra questions before showing times.

Use tools for availability, pricing, appointments, service area. Never list times in text — check_availability shows buttons.

If they pick a time but have no service address on file, ask for street, city, and zip, then use save_client_address. Guests also need name and mobile number before booking.

Confirm before cancel/reschedule. Booking blocks are ~3-hour windows. No medical advice.`;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

const PRICING_BUTTONS: LickyButton[] = [
  {
    label: "Small dog prices",
    action: "send_message",
    payload: { message: "Price for small dog full groom" },
  },
  {
    label: "Medium dog prices",
    action: "send_message",
    payload: { message: "Price for medium dog full groom" },
  },
  {
    label: "Large dog prices",
    action: "send_message",
    payload: { message: "Price for large dog full groom" },
  },
];

async function createFallbackReply(
  messages: ChatMessage[],
  context: string,
  actionCtx: LickyActionContext
): Promise<LickyStructuredResponse> {
  const last = messages.filter((m) => m.role === "user").pop()?.content.toLowerCase() ?? "";

  if (/availability|open slot|when can|what times|schedule|book|appointment|an appt/.test(last)) {
    const groomer =
      last.includes("melanie")
        ? "melanie"
        : last.includes("diamond") || last.includes("sarah")
          ? "diamond"
          : undefined;
    const service = last.includes("bath") ? "bath-brush" : "full-groom";
    return lickyBuildAvailabilityResponse({
      service,
      days: 14,
      groomer_id: groomer,
      holdOwnerId: actionCtx.holdOwnerId,
    });
  }

  if (/price|cost|how much|pricing/.test(last)) {
    const text = truncateLickyReply(
      await executeLickyTool(actionCtx, "get_pricing", {})
    );
    return { reply: text, buttons: PRICING_BUTTONS };
  }

  if (/service area|do you come|county|my area/.test(last)) {
    return structuredFromText(
      await executeLickyTool(actionCtx, "get_service_area", {})
    );
  }

  if (/cancel/.test(last)) {
    return structuredFromText(
      actionCtx.loggedIn
        ? "Say yes to cancel, or use Appointments tab."
        : "Log in at /client/login to cancel a visit."
    );
  }

  if (/when|next appointment|upcoming/.test(last)) {
    const upcoming = context.match(/Upcoming appointments[\s\S]*?(?:\nPets|$)/)?.[0];
    if (upcoming?.includes("id=")) {
      return structuredFromText("Check Appointments tab for your visit details!");
    }
    return structuredFromText("No upcoming visit — tap a time to book!");
  }

  if (/hi|hello|hey/.test(last)) {
    const name = context.match(/Client: (\S+)/)?.[1];
    return structuredFromText(
      name ? `Hi ${name}! What can I help with today?` : "Hi! What can I help with today?"
    );
  }

  return {
    reply: truncateLickyReply("Ask me about grooming, pricing, your visits, or our service area."),
  };
}

export async function createLickyReply(
  messages: ChatMessage[],
  context: string,
  actionCtx: LickyActionContext
): Promise<LickyStructuredResponse> {
  try {
    return await createLickyReplyInner(messages, context, actionCtx);
  } catch (err) {
    console.error("createLickyReply error:", err);
    try {
      return await createFallbackReply(messages, context, actionCtx);
    } catch (fallbackErr) {
      console.error("createLickyReply fallback error:", fallbackErr);
      return structuredFromText("Hi! What can I help with today?");
    }
  }
}

async function createLickyReplyInner(
  messages: ChatMessage[],
  context: string,
  actionCtx: LickyActionContext
): Promise<LickyStructuredResponse> {
  const lastUser =
    messages
      .filter((m) => m.role === "user")
      .pop()
      ?.content.toLowerCase() ?? "";

  const wantsAppointment =
    /appointment|book a|schedule|open (time|slot)|available time|when can|need a groom|want to book|make an appt|get groomed/.test(
      lastUser
    );
  const notOtherTopic = !/cancel|price|cost|how much|service area|my area|reschedule|address|zip/.test(
    lastUser
  );

  if (
    wantsAppointment &&
    notOtherTopic &&
    !getPendingLickyBooking(actionCtx)?.slotKey
  ) {
    const groomer = lastUser.includes("melanie")
      ? "melanie"
      : lastUser.includes("diamond") || lastUser.includes("sarah")
        ? "diamond"
        : undefined;
    const service = lastUser.includes("bath") ? "bath-brush" : "full-groom";
    return lickyBuildAvailabilityResponse({
      service,
      days: 14,
      groomer_id: groomer,
      holdOwnerId: actionCtx.holdOwnerId,
    });
  }

  const client = getOpenAIClient();
  if (!client) {
    return createFallbackReply(messages, context, actionCtx);
  }

  const customTraining = await getLickyCustomTrainingText().catch(() => "");

  const systemContent = [
    LICKY_SYSTEM_PROMPT,
    buildLickyKnowledgeBlock(),
    customTraining ? `CUSTOM TRAINING (from admin — follow closely):\n${customTraining}` : "",
    context ? `Client context:\n${context}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  try {
    for (let round = 0; round < 6; round++) {
      const completion = await client.chat.completions.create({
        model,
        messages: chatMessages,
        tools: LICKY_TOOLS,
        tool_choice: "auto",
        max_tokens: 150,
        temperature: 0.4,
      });

      const message = completion.choices[0]?.message;
      if (!message) break;

      const toolCalls = message.tool_calls;
      if (toolCalls?.length) {
        chatMessages.push(message);
        let availabilityUi: LickyStructuredResponse | null = null;

        for (const call of toolCalls) {
          if (call.type !== "function" || !call.function) {
            chatMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: "Unsupported tool call",
            });
            continue;
          }
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
          } catch {
            args = {};
          }

          if (call.function.name === "check_availability") {
            availabilityUi = await lickyBuildAvailabilityResponse({
              service: typeof args.service === "string" ? args.service : undefined,
              days:
                typeof args.days === "number" && Number.isFinite(args.days)
                  ? args.days
                  : undefined,
              groomer_id: typeof args.groomer_id === "string" ? args.groomer_id : undefined,
              offset: 0,
              holdOwnerId: actionCtx.holdOwnerId,
            });
            chatMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: `${availabilityUi.buttons?.length ?? 0} slot buttons shown`,
            });
            continue;
          }

          const result = await executeLickyTool(actionCtx, call.function.name, args);
          chatMessages.push({
            role: "tool",
            tool_call_id: call.id,
            content: truncateLickyReply(result),
          });
        }

        if (availabilityUi) return availabilityUi;
        continue;
      }

      const text = message.content?.trim();
      if (text) return structuredFromText(text);
      break;
    }

    return createFallbackReply(messages, context, actionCtx);
  } catch (err) {
    console.error("OpenAI chat error:", err);
    return createFallbackReply(messages, context, actionCtx);
  }
}

export function isLickyChatConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function lickyChatStatus(): {
  configured: boolean;
  model: string;
  mode: "openai" | "fallback";
  tools: boolean;
} {
  return {
    configured: isLickyChatConfigured(),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    mode: isLickyChatConfigured() ? "openai" : "fallback",
    tools: true,
  };
}
