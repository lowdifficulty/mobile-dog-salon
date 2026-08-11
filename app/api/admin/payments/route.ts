import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import {
  getPaymentProvider,
  getPaymentsPublicConfig,
  isPaymentsConfigured,
} from "@/lib/payments/gateway";
import { getStripeAccountStatus } from "@/lib/payments/stripe";
import { getSquareAccountStatus } from "@/lib/payments/square";

export async function GET() {
  try {
    await requireAdmin();
    const [config, provider] = await Promise.all([
      getPaymentsPublicConfig(),
      Promise.resolve(getPaymentProvider()),
    ]);

    let stripeStatus = null;
    let squareStatus = null;
    if (provider === "stripe") {
      stripeStatus = await getStripeAccountStatus();
    } else if (provider === "square") {
      squareStatus = await getSquareAccountStatus();
    }

    return NextResponse.json({
      configured: isPaymentsConfigured(),
      provider,
      config,
      stripeStatus,
      squareStatus,
      env: {
        hasStripeSecret: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
        hasStripePublishable: Boolean(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ||
            process.env.STRIPE_PUBLISHABLE_KEY?.trim()
        ),
        hasStripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
        hasSquareToken: Boolean(process.env.SQUARE_ACCESS_TOKEN?.trim()),
        hasSquareApplicationId: Boolean(process.env.SQUARE_APPLICATION_ID?.trim()),
        hasSquareLocationId: Boolean(process.env.SQUARE_LOCATION_ID?.trim()),
        hasSquareWebhook: Boolean(process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim()),
        paymentProviderOverride: process.env.PAYMENT_PROVIDER?.trim() || null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json().catch(() => ({}))) as { action?: string };

    if (body.action === "test-stripe") {
      const status = await getStripeAccountStatus();
      if (!status.ok) {
        return NextResponse.json({ ok: false, error: status.error }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        message: `Stripe connected (${status.livemode ? "live" : "test"} mode).`,
        status,
      });
    }

    if (body.action === "test-square") {
      const status = await getSquareAccountStatus();
      if (!status.ok) {
        return NextResponse.json({ ok: false, error: status.error }, { status: 400 });
      }
      const locationLabel = status.locationName
        ? `${status.locationName} (${status.locationId})`
        : status.locationId;
      return NextResponse.json({
        ok: true,
        message: `Square connected (${status.environment} mode${locationLabel ? ` · ${locationLabel}` : ""}).`,
        status,
      });
    }

    if (body.action === "test") {
      const provider = getPaymentProvider();
      if (provider === "stripe") {
        const status = await getStripeAccountStatus();
        return NextResponse.json({
          ok: status.ok,
          provider,
          status,
          error: status.error,
        });
      }
      if (provider === "square") {
        const status = await getSquareAccountStatus();
        return NextResponse.json({
          ok: status.ok,
          provider,
          status,
          error: status.error,
        });
      }
      return NextResponse.json(
        { ok: false, error: "No payment provider configured", provider: "none" },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Request failed" },
      { status: 400 }
    );
  }
}
