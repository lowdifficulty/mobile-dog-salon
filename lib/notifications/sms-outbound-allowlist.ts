import "server-only";
import { crmPhoneDigits } from "@/lib/crm/phone";

/**
 * When SMS bot mode is `test` (default), only allowlisted phones may receive
 * outbound SMS (booking confirmations, reminders, bot replies, CRM sends).
 *
 * Override with env:
 * - `SMS_OUTBOUND_ALLOWLIST=9493863351,7145551212` — force this list
 * - `SMS_OUTBOUND_ALLOWLIST=*` — allow all numbers (full live outbound)
 */

export type OutboundAllowlistDecision = {
  /** null = allow every destination; array = only these digit forms */
  allowlist: string[] | null;
  reason: "live" | "env" | "test-mode" | "env-open";
};

function parseEnvAllowlist(): string[] | null | undefined {
  const raw = process.env.SMS_OUTBOUND_ALLOWLIST?.trim();
  if (!raw) return undefined;
  if (raw === "*") return null;
  const phones = Array.from(
    new Set(
      raw
        .split(/[\n,]+/)
        .map((p) => crmPhoneDigits(p))
        .filter((p) => p.length >= 10)
    )
  );
  return phones;
}

export async function resolveSmsOutboundAllowlist(): Promise<OutboundAllowlistDecision> {
  const envList = parseEnvAllowlist();
  if (envList === null) {
    return { allowlist: null, reason: "env-open" };
  }
  if (envList) {
    return { allowlist: envList, reason: "env" };
  }

  const { readSmsBotConfig } = await import("@/lib/crm/sms-bot-config");
  const config = await readSmsBotConfig();
  if (config.mode === "live") {
    return { allowlist: null, reason: "live" };
  }

  return { allowlist: config.testPhones, reason: "test-mode" };
}

export function phoneOnSmsAllowlist(phone: string, allowlist: string[]): boolean {
  const digits = crmPhoneDigits(phone);
  return allowlist.some(
    (allowed) => digits === allowed || digits.endsWith(allowed) || allowed.endsWith(digits)
  );
}
