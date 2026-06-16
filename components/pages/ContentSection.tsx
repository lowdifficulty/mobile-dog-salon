import type { ReactNode } from "react";
import BulletList from "./BulletList";

type Bg = "white" | "blue" | "gray" | "tan" | "pink";

const bgMap: Record<Bg, string> = {
  white: "bg-section-white",
  blue: "bg-section-blue",
  gray: "bg-section-gray",
  tan: "bg-section-tan",
  pink: "bg-section-pink",
};

interface ContentSectionProps {
  title?: ReactNode;
  children?: ReactNode;
  bullets?: string[];
  image?: string;
  imageAlt?: string;
  imageLeft?: boolean;
  bg?: Bg;
  className?: string;
}

export default function ContentSection({
  title,
  children,
  bullets,
  image,
  imageAlt = "",
  imageLeft = false,
  bg = "white",
  className = "",
}: ContentSectionProps) {
  const isPinkBg = bg === "pink";

  const textBlock = (
    <div className={isPinkBg ? "text-on-pink-muted" : ""}>
      {title && (
        <h2
          className={`mb-6 ${
            isPinkBg
              ? "site-heading-section-on-pink site-heading-section-left !text-left"
              : "site-heading-section site-heading-section-left !text-left"
          }`}
        >
          {title}
        </h2>
      )}
      {children}
      {bullets && (
        <div className="mt-6">
          <BulletList items={bullets} onPink={isPinkBg} />
        </div>
      )}
    </div>
  );

  if (!image) {
    return (
      <section className={`site-section ${bgMap[bg]} ${className}`}>
        <div className="site-container max-w-3xl mx-auto">{textBlock}</div>
      </section>
    );
  }

  return (
    <section className={`site-section ${bgMap[bg]} ${className}`}>
      <div className="site-container">
        <div className={`grid lg:grid-cols-2 gap-10 lg:gap-14 items-center ${imageLeft ? "" : ""}`}>
          {imageLeft ? (
            <>
              <img src={image} alt={imageAlt} className="img-zoomin w-full aspect-[4/3] shadow-md ring-4 ring-accent/10" />
              {textBlock}
            </>
          ) : (
            <>
              {textBlock}
              <img src={image} alt={imageAlt} className="img-zoomin w-full aspect-[4/3] shadow-md ring-4 ring-accent/10" />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
