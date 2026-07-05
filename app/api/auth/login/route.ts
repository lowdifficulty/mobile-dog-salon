import { NextResponse } from "next/server";
import {
  getSession,
  loginAdmin,
  loginGroomer,
} from "@/lib/scheduling/auth";
import { appendStaffLoginLog } from "@/lib/staff/login-log";
import type { GroomerId } from "@/lib/scheduling/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { role, username, email, password } = body as {
    role?: string;
    username?: string;
    email?: string;
    password?: string;
  };

  if (!password) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  let user = null;

  if (role === "admin") {
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    user = await loginAdmin(email, password);
  } else if (role === "groomer") {
    const id = (username ?? "").toLowerCase() as GroomerId;
    if (id !== "melanie" && id !== "diamond") {
      return NextResponse.json({ error: "Invalid groomer" }, { status: 400 });
    }
    user = await loginGroomer(id, password);
  } else {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await getSession();
  session.user = user;
  await session.save();

  const loginIdentifier =
    role === "admin" ? email!.trim().toLowerCase() : (username ?? "").toLowerCase();
  appendStaffLoginLog({ user, loginIdentifier, request }).catch((err) => {
    console.error("Staff login log failed:", err);
  });

  return NextResponse.json({ success: true, user });
}
