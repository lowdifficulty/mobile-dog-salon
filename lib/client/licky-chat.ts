import "server-only";

import OpenAI from "openai";
import {
  executeLickyTool,
  lickyBookAppointment,
  lickyBuildAvailabilityResponse,
  lickyFindSlot,
  type LickyActionContext,
} from "@/lib/client/licky-actions";
import { buildLickyKnowledgeBlock } from "@/lib/client/licky-knowledge";
import { getLickyCustomTrainingText } from "@/lib/client/licky-config-store";
import { isLickyEnabled } from "@/lib/client/licky-enabled";
import { LICKY_TOOLS } from "@/lib/client/licky-tools";
import type { ChatMessage } from "@/lib/client/licky-types";
import {
  buildAvailabilityResponse,
  structuredFromText,
  truncateLickyReply,
  truncateToolResult,
  type LickyButton,
  type LickyStructuredResponse,
} from "@/lib/client/licky-response";

export type { ChatMessage } from "@/lib/client/licky-types";

const LICKY_SYSTEM_PROMPT = `You are Licky, the friendly tan Chihuahua mascot for Mobile Dog Salon (Orange County + parts of LA County).

You are a knowledgeable, warm assistant — not a rigid script bot. Answer questions about the company, grooming, pricing, service area, policies, and pets using your knowledge and tools. Be helpful and conversational.

BOOKING (conversational):
- Read the ENTIRE conversation. Remember what the client already said (address, phone, name, pet size, preferred groomer/time).
- When they want an appointment, use find_slot when they describe a time ("next Tuesday with Melanie") or check_availability to browse.
- Save address/phone/pet details with save_client_address and save_guest_contact as soon as they mention them — don't ask again.
- Use get_booking_status to see what's still missing before booking.
- When ready and they confirm, call book_appointment with the slot_key and any details you have.
- Booking blocks are ~3-hour arrival windows. Same-day is not available online.
- Guests need address + name + phone. Logged-in clients use account info.
- For cancel/reschedule, logged-in clients only — use list_upcoming_appointments first, confirm before confirmed=true.

Show slot buttons when check_availability or find_slot returns times — the UI displays buttons automatically.

Keep replies concise but complete (a few sentences is fine). No medical or veterinary advice.`;

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

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function createFallbackReply(
  messages: ChatMessage[],
  context: string,
  actionCtx: LickyActionContext
): Promise<LickyStructuredResponse> {
  const last = messages.filter((m) => m.role === "user").pop()?.content.toLowerCase() ?? "";

  if (/availability|open slot|when can|what times|schedule|book|appointment|an appt/.test(last)) {
    const groomer = last.includes("melanie")
      ? "melanie"
      : last.includes("diamond") || last.includes("sarah")
        ? "diamond"
        : undefined;
    const service = last.includes("bath") ? "bath-brush" : "full-groom";

    const find = await lickyFindSlot(actionCtx, {
      preference: messages.filter((m) => m.role === "user").pop()?.content,
      service,
      groomer_id: groomer,
    });
    if (find.slots.length) {
      return buildAvailabilityResponse(find.slots, {
        offset: 0,
        service: find.service,
        days: 14,
        groomerId: groomer,
        fromFallback: find.fromFallback,
      });
    }
    return lickyBuildAvailabilityResponse({
      service,
      days: 14,
      groomer_id: groomer,
      holdOwnerId: actionCtx.holdOwnerId,
    });
  }

  if (/price|cost|how much|pricing/.test(last)) {
    const text = truncateLickyReply(await executeLickyTool(actionCtx, "get_pricing", {}));
    return { reply: text, buttons: PRICING_BUTTONS };
  }

  if (/service area|do you come|county|my area/.test(last)) {
    return structuredFromText(await executeLickyTool(actionCtx, "get_service_area", {}));
  }

  if (/cancel/.test(last)) {
    return structuredFromText(
      actionCtx.loggedIn
        ? "I can help cancel — say which appointment, or log in and check Appointments."
        : "Log in at /client/login to cancel a visit, or call us at (949) 755-8994."
    );
  }

  if (/hi|hello|hey/.test(last)) {
    const name = context.match(/Client: (\S+)/)?.[1];
    return structuredFromText(
      name
        ? `Hi ${name}! I'm Licky — ask me anything about grooming or booking.`
        : "Hi! I'm Licky — ask me about grooming, pricing, open times, or booking a visit."
    );
  }

  return structuredFromText(
    "I'm here to help with grooming questions, pricing, service area, and booking. What would you like to know?"
  );
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
      return structuredFromText(
        "Sorry, I hit a snag! Try again or call (949) 755-8994."
      );
    }
  }
}

async function createLickyReplyInner(
  messages: ChatMessage[],
  context: string,
  actionCtx: LickyActionContext
): Promise<LickyStructuredResponse> {
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
    for (let round = 0; round < 8; round++) {
      const completion = await client.chat.completions.create({
        model,
        messages: chatMessages,
        tools: LICKY_TOOLS,
        tool_choice: "auto",
        max_tokens: 600,
        temperature: 0.55,
      });

      const message = completion.choices[0]?.message;
      if (!message) break;

      const toolCalls = message.tool_calls;
      if (toolCalls?.length) {
        chatMessages.push(message);
        let slotUi: LickyStructuredResponse | null = null;
        let bookUi: LickyStructuredResponse | null = null;

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

          const toolName = call.function.name;

          if (toolName === "check_availability") {
            slotUi = await lickyBuildAvailabilityResponse({
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
              content: truncateToolResult(
                `${slotUi.buttons?.length ?? 0} slot buttons shown to client.`
              ),
            });
            continue;
          }

          if (toolName === "find_slot") {
            const find = await lickyFindSlot(actionCtx, {
              preference: typeof args.preference === "string" ? args.preference : undefined,
              service: typeof args.service === "string" ? args.service : undefined,
              groomer_id: typeof args.groomer_id === "string" ? args.groomer_id : undefined,
              date: typeof args.date === "string" ? args.date : undefined,
            });
            if (find.slots.length) {
              slotUi = buildAvailabilityResponse(find.slots, {
                offset: 0,
                service: find.service,
                days: 14,
                fromFallback: find.fromFallback,
              });
            }
            chatMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: truncateToolResult(find.text),
            });
            continue;
          }

          if (toolName === "book_appointment") {
            bookUi = await lickyBookAppointment(
              actionCtx,
              {
                slot_key: String(args.slot_key ?? ""),
                service: typeof args.service === "string" ? args.service : undefined,
                full_address:
                  typeof args.full_address === "string" ? args.full_address : undefined,
                first_name: typeof args.first_name === "string" ? args.first_name : undefined,
                last_name: typeof args.last_name === "string" ? args.last_name : undefined,
                phone: typeof args.phone === "string" ? args.phone : undefined,
                pet_name: typeof args.pet_name === "string" ? args.pet_name : undefined,
                pet_size: typeof args.pet_size === "string" ? args.pet_size : undefined,
              },
              actionCtx.request
            );
            chatMessages.push({
              role: "tool",
              tool_call_id: call.id,
              content: truncateToolResult(bookUi.reply),
            });
            continue;
          }

          const result = await executeLickyTool(actionCtx, toolName, args);
          chatMessages.push({
            role: "tool",
            tool_call_id: call.id,
            content: truncateToolResult(result),
          });
        }

        if (bookUi) return bookUi;
        if (slotUi) {
          const text = message.content?.trim();
          if (text) {
            return { ...slotUi, reply: truncateLickyReply(text) };
          }
          return slotUi;
        }
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
  enabled: boolean;
  model: string;
  mode: "openai" | "fallback";
  tools: boolean;
} {
  const enabled = isLickyEnabled();
  return {
    enabled,
    configured: enabled && isLickyChatConfigured(),
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    mode: enabled && isLickyChatConfigured() ? "openai" : "fallback",
    tools: enabled,
  };
}
