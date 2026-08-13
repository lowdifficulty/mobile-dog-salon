"use client";

import { useEffect } from "react";

/** Browser-only beacon so SMS link previews do not fake a read receipt. */
export function AppointmentShortLinkOpened({ code }: { code: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/a/${encodeURIComponent(code)}/opened`, {
      method: "POST",
      keepalive: true,
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [code]);

  return null;
}
