"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { stashCrmOpenContact } from "@/lib/crm/open-conversation-client";

export default function GroomerConversationOpener({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function open() {
      try {
        const res = await fetch(
          `/api/admin/crm/contacts/from-appointment?code=${encodeURIComponent(code)}`
        );
        const data = (await res.json()) as { contactId?: string; error?: string };
        if (!res.ok || !data.contactId) {
          throw new Error(data.error ?? "Could not open conversation");
        }
        if (cancelled) return;
        stashCrmOpenContact(data.contactId);
        router.replace("/groomer/dashboard");
        router.refresh();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not open conversation");
        }
      }
    }

    void open();
    return () => {
      cancelled = true;
    };
  }, [code, router]);

  if (error) {
    return (
      <div className="max-w-md mx-auto site-card p-8 mt-10">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => router.replace("/groomer/dashboard")}
          className="mt-4 text-sm font-semibold text-brand hover:underline"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto site-card p-8 mt-10 text-center">
      <p className="text-sm text-gray-600">Opening client conversation…</p>
    </div>
  );
}
