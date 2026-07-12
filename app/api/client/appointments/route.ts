import { NextResponse } from "next/server";
import {
  createAppointment,
  type CreateAppointmentInput,
} from "@/lib/scheduling/appointment-actions";
import { getAppointmentBookedPrice } from "@/lib/booking/appointment-title";
import { mergeAppointmentIds, listClientAppointments } from "@/lib/client/appointments";
import { getClientServiceAddress } from "@/lib/client/licky-address";
import { isLocalhostDevWithoutProductionData } from "@/lib/dev/is-localhost-request";
import { requireClient } from "@/lib/payments/auth";
import { getOrCreateHoldOwnerId } from "@/lib/scheduling/hold-owner";
import { findClientById, updateClient } from "@/lib/payments/store";

export async function GET() {
  try {
    const sessionUser = await requireClient();
    const account = await findClientById(sessionUser.id);
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const appointments = await listClientAppointments(account);
    const now = Date.now();

    return NextResponse.json({
      appointments: appointments.map((ap) => ({
        id: ap.id,
        startAt: ap.startAt,
        groomerId: ap.groomerId,
        service: ap.service,
        petName: ap.petName,
        petSize: ap.petSize,
        status: ap.status,
        address: ap.address,
        city: ap.city,
        zipCode: ap.zipCode,
        isUpcoming: new Date(ap.startAt).getTime() >= now,
        quotedPrice: getAppointmentBookedPrice(ap),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await requireClient();
    const account = await findClientById(sessionUser.id);
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await request.json()) as CreateAppointmentInput & { slotKey?: string };

    const existingAppointments = await listClientAppointments(account);
    const savedAddress = getClientServiceAddress(account, existingAppointments);

    if (!body.slotKey || !body.petSize || !body.service) {
      return NextResponse.json({ error: "Missing booking fields" }, { status: 400 });
    }

    const input: CreateAppointmentInput = {
      slotKey: body.slotKey,
      petName: body.petName ?? account.petProfile?.pets?.[0]?.petName ?? "",
      petSize: body.petSize,
      additionalPets: body.additionalPets,
      service: body.service,
      firstName: account.firstName,
      lastName: account.lastName,
      email: account.email,
      phone: account.phone,
      smsOptIn: true,
      address: body.address?.trim() || savedAddress?.address || "",
      city: body.city?.trim() || savedAddress?.city || "",
      zipCode: body.zipCode?.trim() || savedAddress?.zipCode || "",
      notes: account.lockedInDiscount
        ? "50% phone discount applied. Discount locked in via client portal."
        : "",
    };

    const result = await createAppointment(
      input,
      `client:${account.email}`,
      {
        overrideAvailability: isLocalhostDevWithoutProductionData(request),
        holdOwnerId: await getOrCreateHoldOwnerId(),
      }
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    await updateClient(account.id, {
      appointmentIds: mergeAppointmentIds(
        account.appointmentIds,
        result.appointment.id
      ),
    });

    return NextResponse.json({ appointment: result.appointment });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
