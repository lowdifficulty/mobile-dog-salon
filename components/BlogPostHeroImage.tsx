"use client";

import BookableImage from "./BookableImage";

export default function BlogPostHeroImage({
  src,
  alt,
  bookable = true,
}: {
  src: string;
  alt: string;
  bookable?: boolean;
}) {
  return (
    <BookableImage
      src={src}
      alt={alt}
      bookable={bookable}
      className="img-blog w-full aspect-[16/9] shadow-md ring-4 ring-accent/10"
    />
  );
}
