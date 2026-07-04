import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { SessionUser, GroomerId } from "./types";
import { ADMIN_EMAIL, GROOMERS, groomerIdFromEmail } from "./groomers";

export interface SessionData {
  user?: SessionUser;
}

const ADMIN_PASSWORD_HASH =
  process.env.SCHEDULING_PASSWORD_HASH ??
  "$2b$10$u0DN49dIL.xM4OfVlNIpduTF9jTPmb8IzR2uX.6.cRk1BuOkOcuJ.";

const GROOMER_PASSWORD_HASHES: Record<GroomerId, string> = {
  melanie:
    process.env.SCHEDULING_PASSWORD_HASH_MELANIE ??
    "$2b$10$DUgCSuhis4Mn5iuNMJspBeLS4U6SQuNpbJtNsp48YZYl6MOsV1Bve",
  diamond:
    process.env.SCHEDULING_PASSWORD_HASH_DIAMOND ??
    "$2b$10$fIgTTqJ.fh5P.dS.zHmOw.2K7z8npBMCk6OaXHAUN6YSAlp70tWP.",
};

export function getSessionOptions() {
  const password =
    process.env.SCHEDULING_SESSION_SECRET ??
    "mobile-dog-salon-scheduling-dev-secret-change-in-production";

  return {
    password,
    cookieName: "mds_scheduling_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 14,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export async function verifyPassword(password: string): Promise<boolean> {
  const plain = process.env.SCHEDULING_PASSWORD;
  if (plain) return password === plain;
  return bcrypt.compare(password, ADMIN_PASSWORD_HASH);
}

export async function verifyGroomerPassword(
  groomerId: GroomerId,
  password: string
): Promise<boolean> {
  const plainEnv =
    groomerId === "melanie"
      ? process.env.SCHEDULING_PASSWORD_MELANIE
      : process.env.SCHEDULING_PASSWORD_DIAMOND;
  if (plainEnv) return password === plainEnv;
  return bcrypt.compare(password, GROOMER_PASSWORD_HASHES[groomerId]);
}

export async function loginGroomer(
  groomerId: GroomerId,
  password: string
): Promise<SessionUser | null> {
  if (!GROOMERS[groomerId]) return null;
  if (!(await verifyGroomerPassword(groomerId, password))) return null;
  return {
    role: "groomer",
    groomerId,
    email: GROOMERS[groomerId].email,
    name: GROOMERS[groomerId].name,
  };
}

export async function loginGroomerByEmail(
  email: string,
  password: string
): Promise<SessionUser | null> {
  const groomerId = groomerIdFromEmail(email);
  if (!groomerId) return null;
  return loginGroomer(groomerId, password);
}

export async function loginAdmin(
  email: string,
  password: string
): Promise<SessionUser | null> {
  if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return null;
  if (!(await verifyPassword(password))) return null;
  return {
    role: "admin",
    email: ADMIN_EMAIL,
    name: "Admin",
  };
}

export async function requireGroomer(): Promise<SessionUser> {
  const session = await getSession();
  if (!session.user || session.user.role !== "groomer" || !session.user.groomerId) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await getSession();
  if (!session.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function requireStaff(): Promise<SessionUser> {
  const session = await getSession();
  if (
    !session.user ||
    (session.user.role !== "groomer" && session.user.role !== "admin")
  ) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
