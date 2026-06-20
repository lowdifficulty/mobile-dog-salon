import type { ReactNode } from "react";
import Image from "next/image";
import { BOOKING_DOG_SIZE_ICONS } from "@/lib/images";

interface BookingOptionButtonProps {
  index: number;
  title: string;
  subtitle?: string;
  detail?: string;
  icon?: ReactNode;
  iconSurface?: "default" | "image";
  selected?: boolean;
  onClick: () => void;
}

export default function BookingOptionButton({
  index,
  title,
  subtitle,
  detail,
  icon,
  iconSurface = "default",
  selected = false,
  onClick,
}: BookingOptionButtonProps) {
  const iconContainerClass =
    iconSurface === "image"
      ? "bg-white border-2 border-brand p-1"
      : selected
        ? "bg-brand text-white"
        : "bg-brand/10 text-brand";

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
      {icon && (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconContainerClass}`}
        >
          {icon}
        </span>
      )}
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
  return (
    <Image
      src={BOOKING_DOG_SIZE_ICONS[size]}
      alt=""
      width={36}
      height={36}
      className="h-full w-full object-contain"
      aria-hidden
    />
  );
}
