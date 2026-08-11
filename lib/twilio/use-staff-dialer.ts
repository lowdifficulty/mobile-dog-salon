"use client";

import { useCallback, useState } from "react";
import {
  STAFF_CALLBACK_HELP,
  useStaffCallbackPhone,
} from "@/lib/twilio/use-staff-callback-phone";

export function useStaffDialer() {
  const [toPhone, setToPhone] = useState("");
  const { staffPhone, setStaffPhone, configuredInSettings } = useStaffCallbackPhone();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dial = useCallback(
    async (overrideTo?: string) => {
      const to = (overrideTo ?? toPhone).trim();
      const staff = staffPhone.trim();
      if (!to) {
        setError("Enter the number to call");
        return false;
      }
      if (!staff && !configuredInSettings) {
        setError(STAFF_CALLBACK_HELP);
        return false;
      }
      setBusy(true);
      setMessage(null);
      setError(null);
      try {
        if (staff) setStaffPhone(staff);
        const res = await fetch("/api/admin/twilio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "dial",
            to,
            staffPhone: staff || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || "Call failed");
        setMessage("Calling your phone first — answer to connect to the customer.");
        if (!overrideTo) setToPhone("");
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Call failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [configuredInSettings, setStaffPhone, staffPhone, toPhone]
  );

  return {
    toPhone,
    setToPhone,
    staffPhone,
    setStaffPhone,
    configuredInSettings,
    busy,
    message,
    error,
    setMessage,
    setError,
    dial,
    staffCallbackHelp: STAFF_CALLBACK_HELP,
  };
}
