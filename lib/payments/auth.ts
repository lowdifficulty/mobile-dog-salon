import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { ClientSessionUser } from "./types";

export interface ClientSessionData {
  client?: ClientSessionUser;
}

export function getClientSessionOptions() {
  const password =
    process.env.CLIENT_SESSION_SECRET ??
    process.env.SCHEDULING_SESSION_SECRET ??
    "mobile-dog-salon-client-session-dev-secret";

  return {
    password,
    cookieName: "mds_client_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export async function getClientSession() {
  return getIronSession<ClientSessionData>(await cookies(), getClientSessionOptions());
}

export async function hashClientPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyClientPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function requireClient(): Promise<ClientSessionUser> {
  const session = await getClientSession();
  if (!session.client) {
    throw new Error("Unauthorized");
  }
  return session.client;
}
