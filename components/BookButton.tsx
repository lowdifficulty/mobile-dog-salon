"use client";

import type { ReactNode } from "react";
import { useBooking } from "./BookingProvider";
import type { BookingVariantId } from "@/lib/booking/variants";

interface BookButtonProps {
  className?: string;
  children?: ReactNode;
  /** Opens a groomer-specific calendar (e.g. bookhb on /la, bookoc on /oc). */
  bookingVariant?: BookingVariantId;
}

export default function BookButton({
  className = "",
  children = "Book an Appointment",
  bookingVariant,
}: BookButtonProps) {
  const { openBooking } = useBooking();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.requestAnimationFrame(() => openBooking(bookingVariant));
      }}
      className={`site-btn ${className}`}
    >
      {children}
    </button>
  );
}
