"use client";

import type { ReactNode } from "react";
import { useBooking } from "./BookingProvider";

interface BookButtonProps {
  className?: string;
  children?: ReactNode;
}

export default function BookButton({
  className = "",
  children = "Book an Appointment",
}: BookButtonProps) {
  const { openBooking } = useBooking();

  return (
    <button type="button" onClick={openBooking} className={`site-btn ${className}`}>
      {children}
    </button>
  );
}
