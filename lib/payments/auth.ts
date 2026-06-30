import "server-only";
import { createHash } from "crypto";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { ClientSessionUser } from "./types";

import type { LickyGuestState } from "@/lib/client/licky-guest-types";

export interface ClientSessionData {
  client?: ClientSessionUser;
  /** Guest Licky chat state when not logged in. */
  lickyGuest?: LickyGuestState;
  /** Anonymous id for temporary slot holds during booking. */
  slotHoldOwnerId?: string;
}

/** iron-session requires passwords >= 32 characters. */
function ironSessionPassword(raw: string): string {
  if (raw.length >= 32) return raw;
  return createHash("sha256").update(`mds:iron:${raw}`).digest("hex");
}

export function getClientSessionOptions() {
  const password = ironSessionPassword(
    process.env.CLIENT_SESSION_SECRET ??
      process.env.SCHEDULING_SESSION_SECRET ??
      "mobile-dog-salon-client-session-dev-secret"
  );

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
