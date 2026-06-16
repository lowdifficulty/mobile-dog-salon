import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getClientSession,
  hashClientPassword,
  verifyClientPassword,
} from "@/lib/payments/auth";
import { createClient, findClientByEmail } from "@/lib/payments/store";
import { createSquareCustomer, isSquareConfigured } from "@/lib/payments/square";

export async function POST(request: Request) {
  if (!isSquareConfigured()) {
    return NextResponse.json(
      { error: "Payment portal is not configured yet. Please contact us to pay by phone." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { email, password, firstName, lastName, phone } = body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };

  if (!email?.trim() || !password || !firstName?.trim() || !lastName?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await findClientByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  try {
    const squareCustomerId = await createSquareCustomer({
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    });

    const account = {
      id: randomUUID(),
      email: email.trim().toLowerCase(),
      passwordHash: await hashClientPassword(password),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      squareCustomerId,
      createdAt: new Date().toISOString(),
    };

    await createClient(account);

    const session = await getClientSession();
    session.client = {
      id: account.id,
      email: account.email,
      firstName: account.firstName,
      lastName: account.lastName,
    };
    await session.save();

    return NextResponse.json({ success: true, client: session.client });
  } catch (err) {
    console.error("Client registration failed:", err);
    return NextResponse.json({ error: "Could not create account. Please try again." }, { status: 500 });
  }
}
