"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mds-crm-staff-phone";

export function useStaffCallbackPhone() {
  const [staffPhone, setStaffPhone] = useState("");
  const [configuredInSettings, setConfiguredInSettings] = useState(false);

  useEffect(() => {
    let cancelled = false;

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setStaffPhone(saved);
      }
    } catch {
      /* ignore */
    }

    void fetch("/api/admin/twilio")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.config) return;
        const configured = String(data.config.staffCallbackNumber || "").trim();
        setConfiguredInSettings(Boolean(configured));
        if (configured) {
          setStaffPhone((current) => current.trim() || configured);
        }
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persistStaffPhone = useCallback((value: string) => {
    const trimmed = value.trim();
    setStaffPhone(trimmed);
    try {
      if (trimmed) sessionStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }
  }, []);

  return { staffPhone, setStaffPhone: persistStaffPhone, configuredInSettings };
}

export const STAFF_CALLBACK_HELP =
  "Enter your cell phone (not the business line), or save it under Admin → Phone & SMS → Staff click-to-call phone and click Save settings.";
