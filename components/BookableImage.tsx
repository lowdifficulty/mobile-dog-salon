"use client";

import { useBooking } from "./BookingProvider";

export default function BookableImage({
  src,
  alt,
  className = "",
  bookable = true,
}: {
  src: string;
  alt: string;
  className?: string;
  bookable?: boolean;
}) {
  const { openBooking } = useBooking();

  if (!bookable) {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <button
      type="button"
      onClick={openBooking}
      className="block w-full cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      aria-label="Book an appointment"
    >
      <img
        src={src}
        alt={alt}
        className={`${className} group-hover:scale-[1.02] transition-transform duration-300`}
      />
    </button>
  );
}
