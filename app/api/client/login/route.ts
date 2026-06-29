import { NextResponse } from "next/server";
import { clientToSessionUser } from "@/lib/client/portal";
import {
  getClientSession,
  verifyClientPassword,
} from "@/lib/payments/auth";
import { findClientByIdentifier } from "@/lib/payments/store";

export async function POST(request: Request) {
  const body = await request.json();
  const { identifier, email, password } = body as {
    identifier?: string;
    email?: string;
    password?: string;
  };

  const loginId = (identifier ?? email ?? "").trim();
  if (!loginId || !password) {
    return NextResponse.json(
      { error: "Email or phone and password required" },
      { status: 400 }
    );
  }

  const account = await findClientByIdentifier(loginId);
  if (!account || !(await verifyClientPassword(password, account.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getClientSession();
  session.client = clientToSessionUser(account);
  await session.save();

  return NextResponse.json({ success: true, client: session.client });
}
