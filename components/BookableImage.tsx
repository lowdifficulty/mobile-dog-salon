"use client";

import { useBooking } from "./BookingProvider";

export default function BookableImage({
  src,
  alt,
  className = "",
  bookable = true,
  objectPosition,
}: {
  src: string;
  alt: string;
  className?: string;
  bookable?: boolean;
  objectPosition?: string;
}) {
  const imgStyle = objectPosition ? { objectPosition } : undefined;
  const { openBooking } = useBooking();

  if (!bookable) {
    return <img src={src} alt={alt} className={className} style={imgStyle} />;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.requestAnimationFrame(() => openBooking());
      }}
      className="block w-full cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      aria-label="Book an appointment"
    >
      <img
        src={src}
        alt={alt}
        className={`${className} group-hover:scale-[1.02] transition-transform duration-300`}
        style={imgStyle}
      />
    </button>
  );
}
