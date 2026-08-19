import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type { MetaPlatform } from "@/lib/crm/types";
import { ensureCrmSeeded } from "@/lib/crm/seed";
import { resolveMetaAppSecret, resolveMetaPageId, resolveMetaVerifyToken } from "./config";
import { handleInboundMetaWithBot } from "./bot";
import { recordInboundMeta } from "./messaging";

type MetaWebhookMessaging = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
};

type MetaWebhookEntry = {
  id?: string;
  time?: number;
  messaging?: MetaWebhookMessaging[];
};

export async function verifyMetaWebhookChallenge(request: Request): Promise<Response | null> {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expected = await resolveMetaVerifyToken();

  if (mode === "subscribe" && token && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return null;
}

function detectPlatform(entryPageId: string, recipientId?: string): MetaPlatform {
  if (recipientId && recipientId !== entryPageId) {
    return "instagram";
  }
  return "facebook";
}

export async function processMetaWebhookPayload(payload: {
  object?: string;
  entry?: MetaWebhookEntry[];
}): Promise<{ processed: number; skipped: number }> {
  if (payload.object !== "page" && payload.object !== "instagram") {
    return { processed: 0, skipped: 0 };
  }

  await ensureCrmSeeded();
  const pageId = (await resolveMetaPageId()) || "";

  let processed = 0;
  let skipped = 0;

  for (const entry of payload.entry || []) {
    const entryPageId = entry.id || pageId;
    for (const event of entry.messaging || []) {
      const message = event.message;
      if (!message?.text?.trim()) {
        skipped++;
        continue;
      }
      if (message.is_echo) {
        skipped++;
        continue;
      }

      const psid = event.sender?.id?.trim();
      if (!psid || psid === entryPageId) {
        skipped++;
        continue;
      }

      const platform = detectPlatform(entryPageId, event.recipient?.id);
      const createdAt = event.timestamp
        ? new Date(event.timestamp).toISOString()
        : undefined;

      const { contact, duplicate } = await recordInboundMeta({
        psid,
        platform,
        body: message.text.trim(),
        metaMessageId: message.mid,
        createdAt,
        skipIfExists: true,
      });

      if (duplicate) {
        skipped++;
        continue;
      }

      processed++;
      try {
        await handleInboundMetaWithBot({ contact, inboundBody: message.text.trim() });
      } catch (err) {
        console.error("Meta bot reply failed:", err);
      }
    }
  }

  return { processed, skipped };
}

export async function verifyMetaWebhookSignatureFromEnv(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const secret = await resolveMetaAppSecret();
  if (!secret) return true;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}
