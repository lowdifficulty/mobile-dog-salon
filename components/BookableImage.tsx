"use client";

import Image from "next/image";
import { useBooking } from "./BookingProvider";

export default function BookableImage({
  src,
  alt,
  className = "",
  bookable = true,
  objectPosition,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  bookable?: boolean;
  objectPosition?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const { openBooking } = useBooking();

  const image = (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"}
      quality={priority ? 70 : 75}
      className={`object-cover ${bookable ? "group-hover:scale-[1.02] transition-transform duration-300" : ""}`}
      style={objectPosition ? { objectPosition } : undefined}
      priority={priority}
      loading={priority ? undefined : "lazy"}
    />
  );

  const wrapperClass = `relative block w-full overflow-hidden ${className}`;

  if (!bookable) {
    return <div className={wrapperClass}>{image}</div>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        window.requestAnimationFrame(() => openBooking());
      }}
      className={`${wrapperClass} cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`}
      aria-label="Book an appointment"
    >
      {image}
    </button>
  );
}
