/** True when the request targets a local dev server (not production). */
export function isLocalhostRequest(request: Request): boolean {
  const host = (request.headers.get("host") ?? "").toLowerCase();
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}
