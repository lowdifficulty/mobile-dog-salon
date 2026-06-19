"use client";

import { useRouter } from "next/navigation";

function canNavigateBack(): boolean {
  if (typeof window === "undefined") return false;

  const historyIdx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof historyIdx === "number") return historyIdx > 0;

  try {
    if (!document.referrer) return false;
    return new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}

export default function BookPageBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (canNavigateBack()) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="fixed top-5 right-5 z-50 p-2 text-white/50 hover:text-white/80 transition-colors"
      aria-label="Go back"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
