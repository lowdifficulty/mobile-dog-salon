import { getImageProps } from "next/image";
import { BRANDING_AD } from "@/lib/images";
import { HERO_IMAGE_QUALITY, HERO_IMAGE_SIZES } from "@/lib/hero-image";

/** Preload the hero LCP image with fetchpriority=high for Lighthouse discovery. */
export default function HeroLcpPreload() {
  const {
    props: { srcSet, sizes, src },
  } = getImageProps({
    alt: "",
    src: BRANDING_AD,
    width: 384,
    height: 384,
    sizes: HERO_IMAGE_SIZES,
    quality: HERO_IMAGE_QUALITY,
  });

  return (
    <link
      rel="preload"
      as="image"
      href={src}
      imageSrcSet={srcSet}
      imageSizes={sizes}
      fetchPriority="high"
    />
  );
}
