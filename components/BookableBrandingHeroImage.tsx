"use client";

import BookableImage from "./BookableImage";
import { BRANDING_AD } from "@/lib/images";

export default function BookableBrandingHeroImage({ className = "" }: { className?: string }) {
  return (
    <BookableImage
      src={BRANDING_AD}
      alt="Licky the Chihuahua and Hattie the Chocolate Lab — Good Dogs Take Baths"
      bookable
      className={`aspect-square max-w-lg mx-auto drop-shadow-xl ${className}`}
    />
  );
}
