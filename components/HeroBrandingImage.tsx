import Image from "next/image";
import Link from "next/link";
import { BRANDING_AD } from "@/lib/images";
import { HERO_IMAGE_QUALITY, HERO_IMAGE_SIZES } from "@/lib/hero-image";
import { ROUTES } from "@/lib/routes";

type HeroBrandingImageProps = {
  className?: string;
  /** Omit for book link. Pass `null` for a static image (no link). */
  href?: string | null;
  ariaLabel?: string;
};

/** Server-rendered LCP image — avoids client hydration on the hero graphic. */
export default function HeroBrandingImage({
  className = "",
  href = ROUTES.book,
  ariaLabel = "Book an appointment",
}: HeroBrandingImageProps) {
  const imageClass =
    `relative block w-full aspect-square max-w-lg mx-auto overflow-hidden drop-shadow-xl rounded-[30px] ring-4 ring-white/80 ${className}`.trim();

  const image = (
    <Image
      src={BRANDING_AD}
      alt="Licky the Chihuahua and Hattie the Chocolate Lab — Good Dogs Take Baths"
      fill
      priority
      fetchPriority="high"
      quality={HERO_IMAGE_QUALITY}
      sizes={HERO_IMAGE_SIZES}
      className="object-cover"
    />
  );

  if (href === null) {
    return <div className={imageClass}>{image}</div>;
  }

  return (
    <Link href={href} className={imageClass} aria-label={ariaLabel}>
      {image}
    </Link>
  );
}
