"use client";

import { useBooking } from "./BookingProvider";

export default function HeroBookButton() {
  const { openBooking, isBookingOpen } = useBooking();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.requestAnimationFrame(() => openBooking());
      }}
      className={`site-btn site-btn-hero ${isBookingOpen ? "" : "site-btn-hero-attention"}`}
    >
      Book an Appointment
    </button>
  );
}
