import type { ReactNode } from "react";
import Image from "next/image";
import { BOOKING_DOG_SIZE_ICONS } from "@/lib/images";

interface BookingOptionButtonProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "picture" | "text";
  selected?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onClick: () => void;
}

function edgeClass(isFirst: boolean, isLast: boolean) {
  if (isFirst && isLast) return "rounded-lg";
  if (isFirst) return "rounded-l-lg border-r border-[#eaeaeb]";
  if (isLast) return "rounded-r-lg";
  return "border-r border-[#eaeaeb]";
}

export default function BookingOptionButton({
  title,
  subtitle,
  icon,
  variant = "text",
  selected = false,
  isFirst = true,
  isLast = true,
  onClick,
}: BookingOptionButtonProps) {
  const edge = edgeClass(isFirst, isLast);
  const stateClass = selected
    ? "bg-[#878787] text-white"
    : "bg-[#fafafb] text-[#0a0908] hover:bg-[#878787]/10";

  const labelBlock = (
    <span className="min-w-0">
      <span
        className={`block font-bold ${
          variant === "picture"
            ? "text-sm leading-tight sm:text-base"
            : "text-sm leading-snug sm:text-base"
        }`}
      >
        {title}
      </span>
      {subtitle && (
        <span
          className={`block font-normal ${
            variant === "picture"
              ? "text-xs sm:text-sm mt-0 leading-tight"
              : "text-xs sm:text-sm mt-1 leading-snug"
          } ${selected ? "text-white/85" : "text-[#505051]"}`}
        >
          {subtitle}
        </span>
      )}
    </span>
  );

  if (variant === "picture") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`min-w-0 flex-1 px-2 py-4 text-center transition-colors active:scale-[0.995] sm:px-3 sm:py-5 ${edge} ${stateClass}`}
      >
        <span className="mx-auto flex flex-col items-center gap-2 sm:gap-3">
          {icon && (
            <span className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-brand bg-white p-1.5 sm:h-20 sm:w-20 sm:p-2">
              {icon}
            </span>
          )}
          {labelBlock}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 flex-1 px-2 py-4 text-center transition-colors active:scale-[0.995] sm:px-3 sm:py-5 ${edge} ${stateClass}`}
    >
      <span className="block px-1">{labelBlock}</span>
    </button>
  );
}

export function DogSizeIcon({ size }: { size: "small" | "medium" | "large" }) {
  return (
    <Image
      src={BOOKING_DOG_SIZE_ICONS[size]}
      alt=""
      width={80}
      height={80}
      className="h-full w-full object-contain"
      aria-hidden
    />
  );
}
