import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { SessionUser, GroomerId } from "./types";
import { ADMIN_EMAIL, GROOMERS, groomerIdFromEmail } from "./groomers";

export interface SessionData {
  user?: SessionUser;
}

const PASSWORD_HASH =
  process.env.SCHEDULING_PASSWORD_HASH ??
  "$2b$10$5Doi4/8okDEgPDEV/kNHhObuK8JpKMyetC7hcb0PLimXekrEfr39O";

export function getSessionOptions() {
  const password =
    process.env.SCHEDULING_SESSION_SECRET ??
    process.env.SCHEDULING_PASSWORD ??
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
  return bcrypt.compare(password, PASSWORD_HASH);
}

export async function loginGroomer(
  groomerId: GroomerId,
  password: string
): Promise<SessionUser | null> {
  if (!GROOMERS[groomerId]) return null;
  if (!(await verifyPassword(password))) return null;
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
