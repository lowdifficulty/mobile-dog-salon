import "server-only";
import { Resend } from "resend";
import {
  readResendWebhookConfig,
  writeResendWebhookConfig,
} from "./resend-webhook-config";

const TRACKED_EVENTS = [
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
] as const;

function publicSiteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.QA_SITE_URL?.trim() ||
    "https://mobiledog-salon.com"
  ).replace(/\/$/, "");
}

export function resendWebhookEndpointUrl(): string {
  return `${publicSiteBase()}/api/webhooks/resend`;
}

export async function getResendWebhookStatus(): Promise<{
  configured: boolean;
  webhookId?: string;
  endpoint?: string;
  hasSigningSecret: boolean;
  source: "env" | "runtime" | "none";
}> {
  const runtime = await readResendWebhookConfig();
  const envSecret = Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim());
  const runtimeSecret = Boolean(runtime.signingSecret?.trim());
  return {
    configured: Boolean(runtime.webhookId || envSecret || runtimeSecret),
    webhookId: runtime.webhookId,
    endpoint: runtime.endpoint || resendWebhookEndpointUrl(),
    hasSigningSecret: envSecret || runtimeSecret,
    source: envSecret ? "env" : runtimeSecret ? "runtime" : "none",
  };
}

export async function ensureResendWebhook(): Promise<{
  ok: boolean;
  created: boolean;
  reused: boolean;
  webhookId?: string;
  endpoint: string;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const endpoint = resendWebhookEndpointUrl();
  if (!apiKey) {
    return { ok: false, created: false, reused: false, endpoint, error: "RESEND_API_KEY is not set" };
  }

  const resend = new Resend(apiKey);
  const existing = await readResendWebhookConfig();

  if (existing.webhookId && existing.signingSecret) {
    const got = await resend.webhooks.get(existing.webhookId);
    if (!got.error && got.data) {
      // Keep event subscriptions up to date for delivery analytics.
      await resend.webhooks.update(existing.webhookId, {
        events: [...TRACKED_EVENTS],
        status: "enabled",
      });
      return {
        ok: true,
        created: false,
        reused: true,
        webhookId: existing.webhookId,
        endpoint: existing.endpoint || endpoint,
      };
    }
  }

  const listed = await resend.webhooks.list({ limit: 100 });
  if (listed.error) {
    const message =
      typeof listed.error.message === "string"
        ? listed.error.message
        : "Failed to list Resend webhooks";
    return {
      ok: false,
      created: false,
      reused: false,
      endpoint,
      error: /restricted to only send emails/i.test(message)
        ? `${message}. Create a full-access Resend API key (or add a webhook manually in the Resend dashboard to https://mobiledog-salon.com/api/webhooks/resend and set RESEND_WEBHOOK_SECRET).`
        : message,
    };
  }

  const match = listed.data?.data?.find(
    (w) => w.endpoint?.replace(/\/$/, "") === endpoint
  );

  if (match?.id) {
    const got = await resend.webhooks.get(match.id);
    if (!got.error && got.data?.signing_secret) {
      await resend.webhooks.update(match.id, {
        events: [...TRACKED_EVENTS],
        status: "enabled",
      });
      await writeResendWebhookConfig({
        webhookId: match.id,
        signingSecret: got.data.signing_secret,
        endpoint,
      });
      return {
        ok: true,
        created: false,
        reused: true,
        webhookId: match.id,
        endpoint,
      };
    }
  }

  const created = await resend.webhooks.create({
    endpoint,
    events: [...TRACKED_EVENTS],
  });

  if (created.error || !created.data) {
    const message =
      typeof created.error?.message === "string"
        ? created.error.message
        : "Failed to create Resend webhook";
    return {
      ok: false,
      created: false,
      reused: false,
      endpoint,
      error: /restricted to only send emails/i.test(message)
        ? `${message}. Create a full-access Resend API key (or add a webhook manually in the Resend dashboard to ${endpoint} and set RESEND_WEBHOOK_SECRET).`
        : message,
    };
  }

  const webhookId = created.data.id;
  const signingSecret = created.data.signing_secret;

  if (!webhookId || !signingSecret) {
    return {
      ok: false,
      created: false,
      reused: false,
      endpoint,
      error: "Resend created webhook but did not return a signing secret",
    };
  }

  await writeResendWebhookConfig({
    webhookId,
    signingSecret,
    endpoint,
  });

  return { ok: true, created: true, reused: false, webhookId, endpoint };
}
