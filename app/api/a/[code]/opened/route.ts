import { NextResponse } from "next/server";
import { markAppointmentSmsReadFromShortLink } from "@/lib/crm/sms-receipts";
import { getSession } from "@/lib/scheduling/auth";
import { findAppointmentByShortCode } from "@/lib/scheduling/appointment-short-link";

function looksLikePreviewBot(userAgent: string): boolean {
  return /bot|crawler|spider|preview|facebookexternalhit|twitterbot|slackbot|whatsapp|telegrambot|discordbot|linkedinbot|embedly|skypeuripreview|googlebot|bingbot|applebot|iab-xml/i.test(
    userAgent
  );
}

/** Customer opened `/a/[code]` in a browser — mark correlated outbound SMS as read. */
export async function POST(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const userAgent = request.headers.get("user-agent") || "";
  if (looksLikePreviewBot(userAgent)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const session = await getSession();
  if (session.user) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { code } = await context.params;
  const appointment = await findAppointmentByShortCode(code);
  if (!appointment) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    await markAppointmentSmsReadFromShortLink({
      appointmentId: appointment.id,
      shortCode: appointment.shortCode || code,
      phone: appointment.phone,
    });
  } catch (err) {
    console.error("Short-link SMS read receipt failed:", err);
  }

  return NextResponse.json({ ok: true });
}
