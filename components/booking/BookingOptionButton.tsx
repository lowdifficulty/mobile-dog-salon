import type { ReactNode } from "react";
import Image from "next/image";
import { BOOKING_DOG_SIZE_ICONS } from "@/lib/images";

interface BookingOptionButtonProps {
  title: string;
  subtitle?: string;
  bullets?: readonly string[];
  icon?: ReactNode;
  variant?: "picture" | "text";
  selected?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onClick: () => void;
}

function selectionIndicator(selected: boolean) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        selected
          ? "border-white bg-white/20"
          : "border-gray-400 bg-white group-hover:border-brand"
      }`}
      aria-hidden
    >
      {selected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
    </span>
  );
}

export default function BookingOptionButton({
  title,
  subtitle,
  bullets,
  icon,
  variant = "text",
  selected = false,
  isFirst: _isFirst = true,
  isLast: _isLast = true,
  onClick,
}: BookingOptionButtonProps) {
  const stateClass = selected
    ? "border-[#878787] bg-[#878787] text-white shadow-md"
    : "border-gray-200 bg-white shadow-sm hover:border-brand hover:bg-brand-light/60 hover:shadow-md active:bg-brand-light";

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
      {bullets && bullets.length > 0 && (
        <ul
          className={`mt-2 space-y-0.5 text-left ${
            selected ? "text-white/90" : "text-[#505051]"
          }`}
        >
          {bullets.map((item) => (
            <li key={item} className="flex gap-1.5 text-[11px] leading-snug">
              <span className="shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </span>
  );

  const baseClass = `group min-w-0 flex-1 cursor-pointer rounded-lg border-2 px-2 py-4 transition-all duration-150 active:scale-[0.98] sm:px-3 sm:py-5 ${stateClass}`;

  if (variant === "picture") {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} text-center`}>
        <span className="mx-auto flex flex-col items-center gap-2 sm:gap-3">
          {selectionIndicator(selected)}
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
      className={`${baseClass} ${bullets?.length ? "text-left" : "text-center"}`}
    >
      <span className="flex flex-col gap-2 px-1">
        <span className={bullets?.length ? "" : "mx-auto"}>{selectionIndicator(selected)}</span>
        {labelBlock}
      </span>
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
