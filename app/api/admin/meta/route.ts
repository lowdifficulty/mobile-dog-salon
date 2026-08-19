import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  expectedMetaWebhookUrl,
  metaStatus,
  readMetaRuntimeConfig,
  resolveMetaWebhookBase,
  writeMetaRuntimeConfig,
  type MetaRuntimeConfig,
} from "@/lib/meta/config";
import { testMetaConnection } from "@/lib/meta/client";
import { backfillMetaConversations } from "@/lib/meta/backfill";

function maskSecret(value?: string): string | undefined {
  if (!value) return undefined;
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export async function GET() {
  try {
    await requireAdmin();
    const [status, runtime, base] = await Promise.all([
      metaStatus(),
      readMetaRuntimeConfig(),
      resolveMetaWebhookBase(),
    ]);
    const webhookUrl = base ? expectedMetaWebhookUrl(base) : null;

    return NextResponse.json({
      status,
      config: {
        appId: runtime.appId || process.env.META_APP_ID || "",
        appSecret: runtime.appSecret || "",
        pageId: runtime.pageId || process.env.META_PAGE_ID || "",
        pageAccessToken: runtime.pageAccessToken || "",
        instagramAccountId:
          runtime.instagramAccountId || process.env.META_INSTAGRAM_ACCOUNT_ID || "",
        verifyToken: runtime.verifyToken || process.env.META_VERIFY_TOKEN || "",
        webhookBaseUrl: runtime.webhookBaseUrl || base || "",
        backfilledAt: runtime.backfilledAt,
        updatedAt: runtime.updatedAt,
        hasEnvPageToken: Boolean(process.env.META_PAGE_ACCESS_TOKEN?.trim()),
        hasEnvPageId: Boolean(process.env.META_PAGE_ID?.trim()),
        pageAccessTokenMasked: maskSecret(
          runtime.pageAccessToken || process.env.META_PAGE_ACCESS_TOKEN
        ),
        appSecretMasked: maskSecret(runtime.appSecret || process.env.META_APP_SECRET),
      },
      webhookUrl,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as Partial<MetaRuntimeConfig>;
    const config = await writeMetaRuntimeConfig(body);
    const status = await metaStatus();
    return NextResponse.json({ ok: true, config, status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      days?: number;
    };

    if (body.action === "test") {
      const result = await testMetaConnection();
      const status = await metaStatus();
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error, status }, { status: 400 });
      }
      return NextResponse.json({ ...result, status });
    }

    if (body.action === "backfill") {
      const result = await backfillMetaConversations({ days: body.days ?? 7 });
      const status = await metaStatus();
      if (!result.ok) {
        return NextResponse.json({ ...result, status }, { status: 400 });
      }
      return NextResponse.json({ ...result, status });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed" },
      { status: 400 }
    );
  }
}
