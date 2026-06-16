import type { ReactNode } from "react";

type BgVariant = "white" | "blue" | "gray" | "hero" | "tan" | "pattern-blue" | "pattern-white";

const bgClasses: Record<BgVariant, string> = {
  white: "bg-section-white",
  blue: "bg-section-blue",
  gray: "bg-section-gray",
  hero: "bg-section-hero",
  tan: "bg-section-tan",
  "pattern-blue": "bg-section-pattern-blue",
  "pattern-white": "bg-section-pattern-white",
};

interface PageHeroProps {
  title: ReactNode;
  subtitle?: string;
  background?: BgVariant;
  image?: string;
  imageAlt?: string;
}

export default function PageHero({
  title,
  subtitle,
  background = "hero",
  image,
  imageAlt = "",
}: PageHeroProps) {
  return (
    <section className={`site-section ${bgClasses[background]}`}>
      <div className="site-container">
        <div className={`grid gap-10 items-center ${image ? "lg:grid-cols-2" : ""}`}>
          <div className={image ? "" : "max-w-3xl mx-auto text-center"}>
            <h1 className={`site-heading-hero mb-4 ${image ? "" : "text-center"}`}>{title}</h1>
            {subtitle && (
              <p className={`text-gray-600 text-lg leading-relaxed ${image ? "max-w-xl" : "max-w-2xl mx-auto"}`}>
                {subtitle}
              </p>
            )}
          </div>
          {image && (
            <img
              src={image}
              alt={imageAlt}
              className="img-zoomin w-full aspect-[4/3] shadow-lg ring-4 ring-accent/15"
            />
          )}
        </div>
      </div>
    </section>
  );
}
