import { NextResponse } from "next/server";
import {
  getSession,
  loginAdmin,
  loginGroomerByEmail,
} from "@/lib/scheduling/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { role, email, password } = body as {
    role?: string;
    email?: string;
    password?: string;
  };

  if (!email?.trim() || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  let user = null;

  if (role === "admin") {
    user = await loginAdmin(email, password);
  } else if (role === "groomer") {
    user = await loginGroomerByEmail(email, password);
  } else {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.user = user;
  await session.save();

  return NextResponse.json({ success: true, user });
}
