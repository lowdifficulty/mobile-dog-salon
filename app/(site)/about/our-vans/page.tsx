import type { Metadata } from "next";
import PageHero from "@/components/pages/PageHero";
import ContentSection from "@/components/pages/ContentSection";
import FeatureGrid from "@/components/pages/FeatureGrid";
import BookButton from "@/components/BookButton";
import CareersCTA, { LocationsCTA } from "@/components/pages/PageCTAs";
import { IMAGE_SLOTS } from "@/lib/images";
import { VAN_FEATURES } from "@/lib/page-content";
import { dogPhoto } from "@/lib/images";

export const metadata: Metadata = {
  title: "Our Vans | Mobile Dog Salon",
  description: "State-of-the-art mobile pet spas — quiet, one-on-one grooming without cages or chaos.",
};

export default function OurVansPage() {
  return (
    <>
      <PageHero
        title={<>State-of-the-Art <span className="site-heading-pink">Mobile Pet Spas</span></>}
        subtitle="Our mobile spas offer quiet, one-on-one grooming sessions without the chaos — no cages, no barking rooms, just clean, calming care that pets actually enjoy."
        image={IMAGE_SLOTS.vans}
        imageAlt="Mobile grooming van"
      />
      <ContentSection bg="white">
        <p className="text-gray-600 text-lg leading-relaxed mb-4">
          Each Mobile Dog Salon van is a fully self-contained grooming studio parked at your curb.
          Warm filtered water, hydraulic tables, quiet dryers, and premium products — everything a top salon has, without the drive or the wait.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Big or small, fluffy or short-haired — every pet gets spa-level attention in our mobile salons,
          sanitized and refreshed between every appointment.
        </p>
      </ContentSection>
      <section className="site-section bg-section-blue">
        <div className="site-container">
          <h2 className="site-heading-section mb-10">Van Amenities</h2>
          <FeatureGrid features={VAN_FEATURES} columns={3} />
        </div>
      </section>
      <ContentSection
        title="Sanitized Between Every Visit"
        image={dogPhoto(4)}
        imageAlt="Clean mobile grooming setup"
        imageLeft
        bg="gray"
      >
        <p className="text-gray-600 leading-relaxed mb-4">
          Cleanliness is non-negotiable. Our vans are thoroughly cleaned and sanitized between appointments —
          tables, tools, tubs, and surfaces — so every pet starts their session in a fresh, safe environment.
        </p>
        <p className="text-gray-600 leading-relaxed">
          We use eco-friendly products that are gentle on pets and kind to the planet.
          Your pup gets the full spa experience without harsh chemicals or overpowering salon smells.
        </p>
        <div className="mt-8">
          <BookButton />
        </div>
      </ContentSection>
      <LocationsCTA />
      <CareersCTA />
    </>
  );
}
