import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { twilioStatus, getTwilioClient } from "@/lib/notifications/twilio-client";
import {
  readTwilioRuntimeConfig,
  writeTwilioRuntimeConfig,
  type TwilioRuntimeConfig,
} from "@/lib/notifications/twilio-runtime-config";

export async function GET() {
  try {
    await requireAdmin();
    const [status, runtime] = await Promise.all([
      twilioStatus(),
      readTwilioRuntimeConfig(),
    ]);
    return NextResponse.json({
      status,
      config: {
        accountSid: runtime.accountSid || "",
        fromNumber: runtime.fromNumber || process.env.TWILIO_FROM_NUMBER || "",
        voiceCallerId: runtime.voiceCallerId || "",
        staffCallbackNumber: runtime.staffCallbackNumber || "",
        voiceForwardNumber: runtime.voiceForwardNumber || "",
        webhookBaseUrl: runtime.webhookBaseUrl || "",
        updatedAt: runtime.updatedAt,
        hasEnvApiKey: Boolean(
          process.env.TWILIO_API_KEY_SID?.trim() &&
            process.env.TWILIO_API_KEY_SECRET?.trim()
        ),
        hasEnvAccountSid: Boolean(process.env.TWILIO_ACCOUNT_SID?.trim()),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as Partial<TwilioRuntimeConfig>;
    const config = await writeTwilioRuntimeConfig(body);
    const status = await twilioStatus();
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
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "test") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const client = await getTwilioClient();
    const status = await twilioStatus();
    if (!client || !status.hasAccountSid) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Account SID or API credentials",
          status,
        },
        { status: 400 }
      );
    }

    const accountSid = (await import("@/lib/notifications/twilio-runtime-config")).resolveTwilioAccountSid;
    const sid = await accountSid();
    const account = await client.api.accounts(sid!).fetch();
    const numbers = await client.incomingPhoneNumbers.list({ limit: 10 });

    return NextResponse.json({
      ok: true,
      status,
      account: { friendlyName: account.friendlyName, status: account.status },
      numbers: numbers.map((n) => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Twilio test failed" },
      { status: 400 }
    );
  }
}
