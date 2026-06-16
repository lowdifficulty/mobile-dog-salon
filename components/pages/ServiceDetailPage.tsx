import type { ReactNode } from "react";
import PageHero from "./PageHero";
import BookButton from "../BookButton";
import BulletList from "./BulletList";
import Reviews from "../Reviews";
import FAQSection from "./FAQSection";
import ContentSection from "./ContentSection";
import { ExploreOtherServices } from "./ServiceCardGrid";
import CareersCTA, { LocationsCTA } from "./PageCTAs";

interface ServiceDetailPageProps {
  title: ReactNode;
  subtitle: string;
  image: string;
  imageAlt?: string;
  intro: string;
  bullets: string[];
  included: string[];
  idealFor?: string[];
  faqs: { question: string; answer: string }[];
  currentHref: string;
}

export default function ServiceDetailPage({
  title,
  subtitle,
  image,
  imageAlt,
  intro,
  bullets,
  included,
  idealFor,
  faqs,
  currentHref,
}: ServiceDetailPageProps) {
  return (
    <>
      <PageHero
        title={title}
        subtitle={subtitle}
        image={image}
        imageAlt={imageAlt ?? "Service"}
        background="hero"
      />
      <section className="site-section bg-section-white">
        <div className="site-container max-w-3xl">
          <p className="text-gray-600 text-lg leading-relaxed mb-8">{intro}</p>
          <h2 className="site-heading-section site-heading-section-left !text-left mb-6">Why Choose This Service</h2>
          <BulletList items={bullets} />
          <div className="mt-8">
            <BookButton />
          </div>
        </div>
      </section>
      <section className="site-section bg-section-blue">
        <div className="site-container max-w-3xl">
          <h2 className="site-heading-section mb-8">What&apos;s Included</h2>
          <BulletList items={included} />
        </div>
      </section>
      {idealFor && idealFor.length > 0 && (
        <ContentSection
          title="Ideal For"
          bullets={idealFor}
          bg="gray"
        />
      )}
      <Reviews />
      <ExploreOtherServices currentHref={currentHref} />
      <FAQSection faqs={faqs} />
      <LocationsCTA />
      <CareersCTA />
    </>
  );
}
