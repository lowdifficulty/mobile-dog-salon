import type { ReactNode } from "react";
import Image from "next/image";
import { BOOKING_DOG_SIZE_ICONS } from "@/lib/images";

interface BookingOptionButtonProps {
  title: string;
  subtitle?: string;
  bullets?: readonly string[];
  icon?: ReactNode;
  variant?: "picture" | "text";
  /** Service packages use a subtle light-blue hover instead of neutral gray. */
  tone?: "default" | "service";
  selected?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onClick: () => void;
}

export default function BookingOptionButton({
  title,
  subtitle,
  bullets,
  icon,
  variant = "text",
  tone = "default",
  selected = false,
  isFirst: _isFirst = true,
  isLast: _isLast = true,
  onClick,
}: BookingOptionButtonProps) {
  const stateClass = selected
    ? "booking-form-option-selected"
    : tone === "service"
      ? "booking-form-option-service"
      : "booking-form-option";

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
          } ${selected ? "text-white/90" : "text-gray-600"}`}
        >
          {subtitle}
        </span>
      )}
      {bullets && bullets.length > 0 && (
        <ul
          className={`mt-2 space-y-0.5 text-left ${
            selected ? "text-white/90" : "text-gray-600"
          }`}
        >
          {bullets.map((item) => (
            <li key={item} className="flex gap-1.5 text-[11px] leading-snug">
              <span className={`shrink-0 ${selected ? "text-white/80" : "text-gray-500"}`}>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </span>
  );

  const baseClass = `min-w-0 flex-1 cursor-pointer rounded-lg px-2 py-4 transition-all duration-150 active:scale-[0.98] sm:px-3 sm:py-5 ${stateClass}`;

  if (variant === "picture") {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} text-center`}>
        <span className="mx-auto flex flex-col items-center gap-2 sm:gap-3">
          {icon && (
            <span
              className={`booking-form-icon-wrap h-16 w-16 sm:h-20 sm:w-20 sm:p-2 ${
                selected ? "booking-form-icon-wrap-selected" : ""
              }`}
            >
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
      className={`${baseClass} ${bullets?.length ? "text-left" : "text-center"}`}
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
      className="h-full w-full object-contain drop-shadow-sm"
      style={{
        filter:
          "brightness(0) saturate(100%) invert(18%) sepia(48%) saturate(1450%) hue-rotate(182deg) brightness(92%) contrast(95%)",
      }}
      aria-hidden
    />
  );
}
