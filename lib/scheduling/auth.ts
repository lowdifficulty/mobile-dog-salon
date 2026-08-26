import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { SessionUser, GroomerId, StaffId } from "./types";
import { ADMIN_EMAIL, GROOMERS, groomerIdFromEmail } from "./groomers";

const GROOMER_LOGIN_ALIASES: Record<string, GroomerId> = {
  melanie: "melanie",
  diamond: "diamond",
  jessica: "jessica",
  chris: "jessica",
};

const STAFF_LOGIN_ALIASES: Record<string, StaffId> = {
  mary: "mary",
};

export function resolveGroomerLogin(username: string): GroomerId | null {
  const key = username.trim().toLowerCase();
  return GROOMER_LOGIN_ALIASES[key] ?? null;
}

export function resolveStaffLogin(username: string): StaffId | null {
  const key = username.trim().toLowerCase();
  return STAFF_LOGIN_ALIASES[key] ?? null;
}

export interface SessionData {
  user?: SessionUser;
}

const ADMIN_PASSWORD_HASH =
  process.env.SCHEDULING_PASSWORD_HASH ??
  "$2b$10$n2rK8CRGl/PmwOVuxdSMNuYDuOo0hEovurPXClfc9aAeV1yDB4aUi";

const MELANIE_DEFAULT_PASSWORD_HASHES = [
  "$2b$10$Fz1AXz1ZlSaf3fGP4vHTo.Erxa3RhzRsCB.Qa2.nEIhv9FItYTHI2", // Licky
  "$2b$10$eZjdMtZpR8eKOWmU.d2jpeUf59/6XZf.a0tWvZBM20VBEM1l69iwm", // licky
  "$2b$10$CS2WQ1klw2MP03YHL8oygOSjNuPi9uPiUHvf9ICjcKkHp7GuSUSbi", // Licky2026!!
  "$2b$10$vcbZM10CX7aqpLLqCZB.D.Kjxd6kgmIaSy00gIXlsiKhFLaZQzyNe", // licky2026!!
];

const MARY_DEFAULT_PASSWORD_HASHES = [
  "$2b$10$aUIh3N7QUBW3Fc15eDqFXeSXm06nJN76AODdqyE9az5aFDXEzP9sG", // mary
  "$2b$10$5c3WFd.2aPHZCOYc.GOQoemvY4Ry/S15Z7HNHSpcRbi0vvp9JPoTW", // Mary
];

const STAFF_ACCOUNTS: Record<
  StaffId,
  { name: string; email: string; passwordEnvKey: string; defaultHashes: string[] }
> = {
  mary: {
    name: "Mary",
    email: "mary@mobiledog-salon.com",
    passwordEnvKey: "MARY",
    defaultHashes: MARY_DEFAULT_PASSWORD_HASHES,
  },
};

function groomerPasswordHashes(groomerId: GroomerId): string[] {
  const envKey = `SCHEDULING_PASSWORD_HASH_${groomerId.toUpperCase()}` as const;
  const envHashes = process.env[envKey];
  if (envHashes) return envHashes.split(",").map((h) => h.trim()).filter(Boolean);

  if (groomerId === "melanie") return MELANIE_DEFAULT_PASSWORD_HASHES;

  const defaults: Record<Exclude<GroomerId, "melanie">, string> = {
    diamond: "$2b$10$fIgTTqJ.fh5P.dS.zHmOw.2K7z8npBMCk6OaXHAUN6YSAlp70tWP.",
    jessica: "$2b$10$ptiaKlNIZPca/2uWcdJqAO2HHZEG8dXoTtnwQVtt6S0QQj8GB1LZG",
  };
  return [defaults[groomerId]];
}

async function verifyStaffPassword(staffId: StaffId, password: string): Promise<boolean> {
  const account = STAFF_ACCOUNTS[staffId];
  const plainEnv = process.env[`SCHEDULING_PASSWORD_${account.passwordEnvKey}`];
  if (plainEnv) return password === plainEnv;

  const hashEnv = process.env[`SCHEDULING_PASSWORD_HASH_${account.passwordEnvKey}`];
  const hashes = hashEnv
    ? hashEnv.split(",").map((h) => h.trim()).filter(Boolean)
    : account.defaultHashes;

  for (const hash of hashes) {
    if (await bcrypt.compare(password, hash)) return true;
  }
  return false;
}

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
  const envKey = `SCHEDULING_PASSWORD_${groomerId.toUpperCase()}` as const;
  const plainEnv = process.env[envKey];
  if (plainEnv) return password === plainEnv;

  for (const hash of groomerPasswordHashes(groomerId)) {
    if (await bcrypt.compare(password, hash)) return true;
  }
  return false;
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

export async function loginStaff(
  staffId: StaffId,
  password: string
): Promise<SessionUser | null> {
  const account = STAFF_ACCOUNTS[staffId];
  if (!account) return null;
  if (!(await verifyStaffPassword(staffId, password))) return null;
  return {
    role: "staff",
    staffId,
    email: account.email,
    name: account.name,
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
  username: string,
  password: string
): Promise<SessionUser | null> {
  const accountKey = username.trim().toLowerCase();
  if (accountKey !== "1") return null;
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
    (session.user.role !== "groomer" &&
      session.user.role !== "admin" &&
      session.user.role !== "staff")
  ) {
    throw new Error("Unauthorized");
  }
  return session.user;
}
