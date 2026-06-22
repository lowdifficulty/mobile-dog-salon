import Image from "next/image";
import Link from "next/link";
import { BRANDING_AD } from "@/lib/images";
import { HERO_IMAGE_QUALITY, HERO_IMAGE_SIZES } from "@/lib/hero-image";
import { ROUTES } from "@/lib/routes";

/** Server-rendered LCP image — avoids client hydration on the hero graphic. */
export default function HeroBrandingImage({ className = "" }: { className?: string }) {
  return (
    <Link
      href={ROUTES.book}
      className={`relative block w-full aspect-square max-w-lg mx-auto overflow-hidden drop-shadow-xl rounded-[30px] ring-4 ring-white/80 ${className}`.trim()}
      aria-label="Book an appointment"
    >
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
    </Link>
  );
}
