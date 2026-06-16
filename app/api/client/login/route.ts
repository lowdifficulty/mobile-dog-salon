import { NextResponse } from "next/server";
import { getClientSession, verifyClientPassword } from "@/lib/payments/auth";
import { findClientByEmail } from "@/lib/payments/store";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const account = await findClientByEmail(email);
  if (!account || !(await verifyClientPassword(password, account.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getClientSession();
  session.client = {
    id: account.id,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
  };
  await session.save();

  return NextResponse.json({ success: true, client: session.client });
}
