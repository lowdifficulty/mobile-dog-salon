import type { Metadata } from "next";
import PageHero from "@/components/pages/PageHero";
import ContentSection from "@/components/pages/ContentSection";
import FeatureGrid from "@/components/pages/FeatureGrid";
import BookButton from "@/components/BookButton";
import CareersCTA, { LocationsCTA } from "@/components/pages/PageCTAs";
import { IMAGE_SLOTS } from "@/lib/images";
import { GROOMER_PHILOSOPHY, GROOMER_SPECIALTIES } from "@/lib/page-content";
import { HOW_IT_WORKS_STEPS } from "@/lib/constants";
import { dogPhoto } from "@/lib/images";

export const metadata: Metadata = {
  title: "Our Groomers | Mobile Dog Salon",
  description: "Meet the professional mobile pet groomers who bring salon-level care to Orange County.",
};

export default function OurGroomersPage() {
  return (
    <>
      <PageHero
        title={<>The Best <span className="site-heading-pink">Pet Grooming</span> Professionals</>}
        subtitle="Our talented groomers bring salon-level experience to your front door — building real relationships that make visits feel more like play dates."
        image={IMAGE_SLOTS.groomers}
        imageAlt="Professional groomer with dog"
      />
      <ContentSection
        title="Our Grooming Philosophy"
        bullets={GROOMER_PHILOSOPHY}
        bg="white"
      >
        <p className="text-gray-600 leading-relaxed">
          Every groomer on our team shares the same goal: make your pet look amazing and feel safe.
          We take our time, communicate clearly, and never rush a nervous paw.
        </p>
      </ContentSection>
      <section className="site-section bg-section-blue">
        <div className="site-container">
          <h2 className="site-heading-section mb-10">What Makes Our Groomers Special</h2>
          <FeatureGrid features={GROOMER_SPECIALTIES} columns={2} />
        </div>
      </section>
      <ContentSection
        title="One Groomer, One Pet, Every Time"
        image={dogPhoto(2)}
        imageAlt="Groomer caring for dog"
        bg="gray"
      >
        <p className="text-gray-600 leading-relaxed mb-4">
          In a traditional salon, your dog might wait in a cage while other pets are groomed around them.
          With Mobile Dog Salon, your groomer focuses entirely on your pet for the whole session — in a quiet, private mobile spa.
        </p>
        <p className="text-gray-600 leading-relaxed">
          That one-on-one approach is why anxious dogs, senior pets, and first-time groom pups do so well with us.
          Our groomers aren&apos;t just skilled — they&apos;re patient advocates for your pet&apos;s comfort.
        </p>
        <div className="mt-8">
          <BookButton />
        </div>
      </ContentSection>
      <section className="site-section bg-section-white">
        <div className="site-container">
          <h2 className="site-heading-section mb-10">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <div key={step.title} className="site-card p-6 text-center border-t-4 border-accent">
                <div className="site-step-badge">{i + 1}</div>
                <h3 className="font-bold text-brand mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <LocationsCTA />
      <CareersCTA />
    </>
  );
}
