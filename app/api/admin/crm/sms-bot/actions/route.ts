import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/scheduling/auth";
import { ensureCrmSeeded } from "@/lib/crm/seed";
import { findContactById, findContactByPhone } from "@/lib/crm/store";
import {
  getPrimaryUpcomingAppointment,
  listContactAppointments,
  smsBookSlot,
  smsCancelUpcoming,
  smsListBookableSlots,
  smsRescheduleUpcoming,
  smsBookingReadiness,
} from "@/lib/crm/sms-bot-actions";
import { runSmsBotActionFlow } from "@/lib/crm/sms-bot-flow";
import { readSmsBotConfig } from "@/lib/crm/sms-bot-config";
import { crmPhoneDigits } from "@/lib/crm/phone";

async function resolveContact(body: { contactId?: string; phone?: string }) {
  await ensureCrmSeeded();
  return (
    (body.contactId ? await findContactById(body.contactId) : null) ||
    (body.phone ? await findContactByPhone(body.phone) : null)
  );
}

/** Admin testing for SMS bot scheduling actions. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      action?: string;
      contactId?: string;
      phone?: string;
      message?: string;
      appointmentId?: string;
      slotKey?: string;
      preference?: string;
    };

    const contact = await resolveContact(body);
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const action = body.action?.trim();

    if (action === "appointments") {
      const data = await listContactAppointments(contact);
      return NextResponse.json({
        upcoming: data.upcoming,
        past: data.past.slice(0, 5),
      });
    }

    if (action === "readiness") {
      return NextResponse.json({ readiness: smsBookingReadiness(contact) });
    }

    if (action === "list_slots") {
      const { slots, service } = await smsListBookableSlots(contact, {
        preference: body.preference,
      });
      return NextResponse.json({ service, slots });
    }

    if (action === "flow") {
      const message = body.message?.trim();
      if (!message) {
        return NextResponse.json({ error: "message is required" }, { status: 400 });
      }
      const config = await readSmsBotConfig();
      const result = await runSmsBotActionFlow(contact, message, config);
      const refreshed = await resolveContact({ contactId: contact.id });
      return NextResponse.json({
        result,
        session: refreshed?.smsBotSession ?? null,
      });
    }

    if (action === "cancel") {
      const appt =
        (body.appointmentId
          ? (await listContactAppointments(contact)).upcoming.find(
              (a) => a.id === body.appointmentId
            )
          : null) || (await getPrimaryUpcomingAppointment(contact));
      if (!appt) {
        return NextResponse.json({ error: "No upcoming appointment" }, { status: 404 });
      }
      const result = await smsCancelUpcoming(contact, appt.id);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    if (action === "reschedule") {
      const slotKey = body.slotKey?.trim();
      if (!slotKey) {
        return NextResponse.json({ error: "slotKey is required" }, { status: 400 });
      }
      const appt =
        (body.appointmentId
          ? (await listContactAppointments(contact)).upcoming.find(
              (a) => a.id === body.appointmentId
            )
          : null) || (await getPrimaryUpcomingAppointment(contact));
      if (!appt) {
        return NextResponse.json({ error: "No upcoming appointment" }, { status: 404 });
      }
      const result = await smsRescheduleUpcoming(contact, appt.id, slotKey);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    if (action === "book") {
      const slotKey = body.slotKey?.trim();
      if (!slotKey) {
        return NextResponse.json({ error: "slotKey is required" }, { status: 400 });
      }
      const service = body.preference?.trim() || contact.service || "full-groom";
      const result = await smsBookSlot(contact, slotKey, service);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    return NextResponse.json(
      {
        error: "Unknown action",
        actions: [
          "appointments",
          "readiness",
          "list_slots",
          "flow",
          "cancel",
          "reschedule",
          "book",
        ],
      },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Request failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const phone = crmPhoneDigits(url.searchParams.get("phone") ?? "");
    const contactId = url.searchParams.get("contactId") ?? undefined;
    const contact = await resolveContact({ contactId, phone });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }
    const [appointments, readiness, config] = await Promise.all([
      listContactAppointments(contact),
      Promise.resolve(smsBookingReadiness(contact)),
      readSmsBotConfig(),
    ]);
    return NextResponse.json({
      contact: {
        id: contact.id,
        phone: contact.phone,
        name: contact.fullName,
        session: contact.smsBotSession ?? null,
      },
      config: { enableActions: config.enableActions },
      readiness,
      upcoming: appointments.upcoming,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
