/** Hattie chat is on by default. Set LICKY_ENABLED=0 (or NEXT_PUBLIC_LICKY_ENABLED=0) to hide the widget. */
export function isLickyEnabled(): boolean {
  const raw = (
    process.env.LICKY_ENABLED ??
    process.env.NEXT_PUBLIC_LICKY_ENABLED ??
    "1"
  )
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** Inbound Voice AI uses Hattie. Off by default so calls still forward to staff. Set VOICE_AI_ENABLED=1 to enable. */
export function isVoiceAiEnabled(): boolean {
  if (!isLickyEnabled()) return false;
  const raw = (process.env.VOICE_AI_ENABLED ?? "0").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}