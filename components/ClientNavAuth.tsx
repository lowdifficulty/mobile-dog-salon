"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ROUTES } from "@/lib/routes";

type ClientNavAuthProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

export default function ClientNavAuth({ variant = "desktop", onNavigate }: ClientNavAuthProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/client/session");
      const data = await res.json();
      setFirstName(data.client?.firstName ?? null);
    } catch {
      setFirstName(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    setChecking(true);
    void loadSession();
  }, [pathname, loadSession]);

  async function logout() {
    await fetch("/api/client/logout", { method: "POST" });
    setFirstName(null);
    onNavigate?.();
    router.refresh();
    if (pathname.startsWith("/client/")) {
      router.push(ROUTES.home);
    }
  }

  const linkClass =
    variant === "desktop"
      ? "text-sm font-semibold text-brand hover:text-accent transition-colors"
      : "text-sm font-medium text-gray-800 hover:text-accent";

  const logoutClass =
    variant === "desktop"
      ? "text-sm font-semibold text-gray-600 hover:text-brand transition-colors"
      : "text-sm font-medium text-gray-600 hover:text-brand text-left";

  if (checking) {
    return <span className="text-sm text-gray-400 invisible select-none" aria-hidden="true">Log in</span>;
  }

  if (firstName) {
    if (variant === "mobile") {
      return (
        <div className="flex flex-col gap-2 pt-1">
          <Link href={ROUTES.clientHub} className={linkClass} onClick={onNavigate}>
            My portal
          </Link>
          <button type="button" onClick={() => void logout()} className={logoutClass}>
            Log out
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <Link href={ROUTES.clientHub} className={linkClass}>
          My portal
        </Link>
        <button type="button" onClick={() => void logout()} className={logoutClass}>
          Log out
        </button>
      </div>
    );
  }

  return (
    <Link href={ROUTES.clientLogin} className={linkClass} onClick={onNavigate}>
      Log in
    </Link>
  );
}
