/** Client-side helper to reserve a slot while the booking form is in progress. */
export async function holdBookingSlot(
  slotKey: string
): Promise<{ ok: true; expiresAt?: string } | { ok: false; error: string }> {
  const res = await fetch("/api/book/hold", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotKey }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    expiresAt?: string;
  };
  if (!res.ok) {
    return {
      ok: false,
      error: body.error || "That time was just taken — pick another.",
    };
  }
  return { ok: true, expiresAt: body.expiresAt };
}

export async function releaseBookingSlot(slotKey: string): Promise<void> {
  await fetch("/api/book/hold", {
    method: "DELETE",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotKey }),
  }).catch(() => {});
}

export function formatHoldMinutes(ttlSeconds = 600): string {
  return `${ttlSeconds / 60} min`;
}
