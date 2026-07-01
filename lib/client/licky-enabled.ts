/** Turn Licky back on with LICKY_ENABLED=1 (and NEXT_PUBLIC_LICKY_ENABLED=1 for the widget). */
export function isLickyEnabled(): boolean {
  const raw = (
    process.env.LICKY_ENABLED ??
    process.env.NEXT_PUBLIC_LICKY_ENABLED ??
    "0"
  )
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
