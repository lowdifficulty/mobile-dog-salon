import type { ReactNode } from "react";

interface BookingOptionButtonProps {
  index: number;
  title: string;
  subtitle?: string;
  detail?: string;
  icon: ReactNode;
  selected?: boolean;
  onClick: () => void;
}

export default function BookingOptionButton({
  index,
  title,
  subtitle,
  detail,
  icon,
  selected = false,
  onClick,
}: BookingOptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-2xl border px-3 py-3.5 text-left transition-all active:scale-[0.99] ${
        selected
          ? "border-brand bg-brand/5 shadow-sm"
          : "border-gray-200 bg-white hover:border-brand/40 hover:bg-gray-50"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          selected ? "bg-brand text-white" : "bg-brand/10 text-brand"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900 leading-snug">{title}</span>
        {subtitle && (
          <span className="block text-xs text-gray-500 mt-0.5 leading-snug">{subtitle}</span>
        )}
        {detail && (
          <span className="block text-xs font-semibold text-brand mt-1 leading-snug">{detail}</span>
        )}
      </span>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          selected ? "bg-brand text-white" : "bg-gray-100 text-gray-500"
        }`}
        aria-hidden="true"
      >
        {index}
      </span>
    </button>
  );
}

export function DogSizeIcon({ size }: { size: "small" | "medium" | "large" }) {
  const scale = size === "small" ? 0.72 : size === "medium" ? 0.88 : 1;
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-6 w-6"
      style={{ transform: `scale(${scale})` }}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8.5 10.5c1.4 0 2.5-1.1 2.5-2.5S9.9 5.5 8.5 5.5 6 6.6 6 8s1.1 2.5 2.5 2.5zm15 0c1.4 0 2.5-1.1 2.5-2.5S24.9 5.5 23.5 5.5 21 6.6 21 8s1.1 2.5 2.5 2.5zM6 13.5c-1.1.8-2 2.4-2 4.2V24c0 1.1.9 2 2 2h1.5v-6.8c0-1.5.6-2.9 1.6-3.9l1.4-1.4c.4-.4 1-.6 1.6-.6h8.8c.6 0 1.2.2 1.6.6l1.4 1.4c1 1 1.6 2.4 1.6 3.9V26H26c1.1 0 2-.9 2-2v-6.3c0-1.8-.9-3.4-2-4.2-.6-.4-1.3-.7-2-.9-.8 2.2-2.9 3.7-5.3 3.7s-4.5-1.5-5.3-3.7c-.7.2-1.4.5-2 .9z" />
    </svg>
  );
}

export function ServiceIcon({ type }: { type: "full-groom" | "bath-brush" }) {
  if (type === "bath-brush") {
    return (
      <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor" aria-hidden="true">
        <path d="M8 18c0-3.3 2.7-6 6-6h4c3.3 0 6 2.7 6 6v2H8v-2zm6-8a4 4 0 100 8 4 4 0 000-8zm8 10v4c0 1.1-.9 2-2 2H10c-1.1 0-2-.9-2-2v-4h16z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor" aria-hidden="true">
      <path d="M11 6l2 4h6l2-4h2l-1.5 6H10.5L9 6h2zm-1 8h12l-1 10H11L10 14zm4 2v6h2v-6h-2zm4 0v6h2v-6h-2z" />
    </svg>
  );
}
