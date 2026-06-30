import "server-only";

import { randomUUID } from "crypto";
import { getClientSession } from "@/lib/payments/auth";

/** Stable per-browser id for slot holds (stored in the client session cookie). */
export async function getOrCreateHoldOwnerId(): Promise<string> {
  const session = await getClientSession();
  if (!session.slotHoldOwnerId) {
    session.slotHoldOwnerId = randomUUID();
    await session.save();
  }
  return session.slotHoldOwnerId;
}
