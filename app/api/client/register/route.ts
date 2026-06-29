import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { mergeAppointmentIds } from "@/lib/client/appointments";
import { clientToSessionUser } from "@/lib/client/portal";
import {
  getClientSession,
  hashClientPassword,
} from "@/lib/payments/auth";
import {
  createClient,
  findClientByEmail,
  findClientByPhone,
  updateClient,
} from "@/lib/payments/store";
import { createSquareCustomer, isSquareConfigured } from "@/lib/payments/square";
import { readSchedulingData } from "@/lib/scheduling/store";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
  const {
    email,
    password,
    firstName,
    lastName,
    phone,
    appointmentId,
    lockInDiscount,
  } = body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    appointmentId?: string;
    lockInDiscount?: boolean;
  };

  if (!email?.trim() || !password || !firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);

  if (await findClientByEmail(normalizedEmail)) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }
  if (normalizedPhone.length >= 10 && (await findClientByPhone(normalizedPhone))) {
    return NextResponse.json(
      { error: "An account with this phone number already exists" },
      { status: 409 }
    );
  }

  let squareCustomerId = "";
  if (isSquareConfigured()) {
    try {
      squareCustomerId = await createSquareCustomer({
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
    } catch (err) {
      console.error("Square customer creation failed (continuing):", err);
    }
  }

  let appointmentIds: string[] = [];
  if (appointmentId) {
    const { appointments } = await readSchedulingData();
    const ap = appointments.find((a) => a.id === appointmentId);
    if (ap && normalizePhone(ap.phone) === normalizedPhone) {
      appointmentIds = [appointmentId];
    }
  }

  const account = {
    id: randomUUID(),
    email: normalizedEmail,
    passwordHash: await hashClientPassword(password),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone: phone.trim(),
    squareCustomerId,
    createdAt: new Date().toISOString(),
    lockedInDiscount: lockInDiscount === true,
    registrationComplete: true,
    appointmentIds,
    pendingLickyWelcome: lockInDiscount === true,
    petProfile: { pets: [] },
  };

  await createClient(account);

  const session = await getClientSession();
  session.client = clientToSessionUser(account);
  await session.save();

  return NextResponse.json({
    success: true,
    client: session.client,
    lockedInDiscount: account.lockedInDiscount,
  });
  } catch (err) {
    console.error("Client registration failed:", err);
    const message =
      err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
