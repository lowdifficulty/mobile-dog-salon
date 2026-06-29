import "server-only";

import OpenAI from "openai";
import {
  executeLickyTool,
  lickyBuildAvailabilityResponse,
  type LickyActionContext,
} from "@/lib/client/licky-actions";
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

CRITICAL: Every reply must be 60 characters or fewer. No exceptions.

Use tools for availability, pricing, appointments, service area. Never list times in text — check_availability shows buttons to the client.

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
  context?: string,
  actionCtx?: LickyActionContext
): Promise<LickyStructuredResponse> {
  const last = messages.filter((m) => m.role === "user").pop()?.content.toLowerCase() ?? "";

  if (actionCtx) {
    if (/availability|open slot|when can|what times|schedule|book/.test(last)) {
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
      return structuredFromText("Say yes to cancel, or use Appointments tab.");
    }
  }

  if (/when|next appointment|upcoming/.test(last)) {
    const upcoming = context?.match(/Upcoming appointments[\s\S]*?(?:\nPets|$)/)?.[0];
    if (upcoming?.includes("id=")) {
      return structuredFromText("Check Appointments tab for your visit details!");
    }
    return structuredFromText("No upcoming visit — tap a time to book!");
  }

  if (/hi|hello|hey/.test(last)) {
    const name = context?.match(/Client: (\S+)/)?.[1];
    return structuredFromText(
      name ? `Hi ${name}! Ask about times, prices, or area.` : "Hi! How can I help your pup today?"
    );
  }

  return {
    reply: truncateLickyReply("Ask about times, prices, or your appointment!"),
    buttons: [
      {
        label: "Show available times",
        action: "show_availability",
        payload: { service: "full-groom", days: 14 },
      },
    ],
  };
}

export async function createLickyReply(
  messages: ChatMessage[],
  context?: string,
  actionCtx?: LickyActionContext
): Promise<LickyStructuredResponse> {
  const client = getOpenAIClient();
  if (!client || !actionCtx) {
    return createFallbackReply(messages, context, actionCtx);
  }

  const customTraining = await getLickyCustomTrainingText();

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
        max_tokens: 120,
        temperature: 0.4,
      });

      const message = completion.choices[0]?.message;
      if (!message) break;

      const toolCalls = message.tool_calls;
      if (toolCalls?.length) {
        chatMessages.push(message);
        let availabilityUi: LickyStructuredResponse | null = null;

        for (const call of toolCalls) {
          if (call.type !== "function") continue;
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
