/** Human-readable label for appointment.cancelledBy / cancel actors. */
export function formatCancellationActor(actor: string | undefined | null): string {
  const value = actor?.trim();
  if (!value) return "Unknown";

  if (value.startsWith("public:phone:")) {
    return `Customer (${value.slice("public:phone:".length)})`;
  }
  if (value.startsWith("client:")) {
    return `Client (${value.slice("client:".length)})`;
  }
  if (value.toLowerCase() === "admin@mobiledog-salon.com") {
    return "Admin";
  }
  return value;
}
