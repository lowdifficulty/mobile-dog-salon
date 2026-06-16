import { BRANDING_AD, TAGLINE } from "@/lib/images";

interface TaglineProps {
  size?: "hero" | "section";
  className?: string;
}

export default function Tagline({ size = "section", className = "" }: TaglineProps) {
  const hero = size === "hero";

  return (
    <div className={`tagline-sticker ${className}`}>
      <p className={`tagline-good-dogs ${hero ? "text-4xl md:text-6xl" : "text-3xl md:text-4xl"}`}>
        <span className="tagline-good">Good</span>
        <span className="tagline-dogs"> Dogs</span>
      </p>
      <p className={`tagline-take-baths ${hero ? "text-3xl md:text-5xl" : "text-2xl md:text-3xl"}`}>
        Take Baths
      </p>
      {!hero && (
        <p className="text-xs text-brand/60 mt-2 font-semibold tracking-wide uppercase">
          {TAGLINE}
        </p>
      )}
    </div>
  );
}

export function BrandingHeroImage({ className = "" }: { className?: string }) {
  return (
    <img
      src={BRANDING_AD}
      alt="Licky the Chihuahua and Hattie the Chocolate Lab — Good Dogs Take Baths"
      className={`w-full max-w-lg mx-auto drop-shadow-xl ${className}`}
    />
  );
}
