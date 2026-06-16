import type { Metadata } from "next";
import PageHero from "@/components/pages/PageHero";
import ContentSection from "@/components/pages/ContentSection";
import FeatureGrid from "@/components/pages/FeatureGrid";
import BookButton from "@/components/BookButton";
import Reviews from "@/components/Reviews";
import CareersCTA, { LocationsCTA } from "@/components/pages/PageCTAs";
import { IMAGE_SLOTS } from "@/lib/images";
import { WHY_CHOOSE_US, ABOUT_TIMELINE } from "@/lib/page-content";
import { dogPhoto } from "@/lib/images";

export const metadata: Metadata = {
  title: "About Us | Mobile Dog Salon",
  description: "Orange County's mobile pet spa — Good Dogs Take Baths. Professional grooming at your curb, cage-free and stress-free.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        title={<>About <span className="site-heading-pink">Mobile Dog Salon</span></>}
        subtitle="We're Orange County's mobile pet spa — bringing fast, affordable, salon-quality grooming right to your driveway. No stressful drop-offs. No long wait times. Just good dogs taking baths."
        image={IMAGE_SLOTS.about}
        imageAlt="Mobile Dog Salon groomed dog"
        background="hero"
      />
      <ContentSection bg="white">
        <p className="text-gray-600 text-lg leading-relaxed mb-4">
          Mobile Dog Salon was built on a simple idea: every dog deserves a spa day without the chaos of a traditional salon.
          We come to you in our state-of-the-art mobile spas — fully equipped, sanitized, and ready to pamper your pup at the curb.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Our professional groomers provide one-on-one, cage-free sessions so your pet gets calm, unrushed attention from start to finish.
          Whether it&apos;s a full groom, a bath & brush, nail trim, or deshedding treatment — we make grooming easy for pet parents and enjoyable for pets.
        </p>
      </ContentSection>
      <section className="site-section bg-section-blue">
        <div className="site-container">
          <h2 className="site-heading-section mb-10">Why Choose Mobile Dog Salon</h2>
          <FeatureGrid features={WHY_CHOOSE_US} columns={3} />
        </div>
      </section>
      <ContentSection
        title="Pet Driven, Not Profit Driven"
        image={dogPhoto(0)}
        imageAlt="Happy groomed dog"
        imageLeft
        bg="gray"
      >
        <p className="text-gray-600 leading-relaxed mb-4">
          Like the best mobile groomers in the industry, we believe your pet&apos;s comfort comes first.
          Our vans are quiet. Our sessions are private. Our groomers are patient, skilled, and genuinely love what they do.
        </p>
        <p className="text-gray-600 leading-relaxed">
          From anxious rescues to senior sweethearts to energetic puppies — we tailor every visit to your dog&apos;s needs.
          That&apos;s the Mobile Dog Salon difference: professional care with a personal touch, right where you live.
        </p>
      </ContentSection>
      <section className="site-section bg-section-white">
        <div className="site-container max-w-3xl">
          <h2 className="site-heading-section mb-10">Our Promise</h2>
          <div className="space-y-8">
            {ABOUT_TIMELINE.map((item) => (
              <div key={item.title} className="border-l-4 border-accent pl-6">
                <span className="text-accent font-bold text-sm uppercase tracking-wide">{item.year}</span>
                <h3 className="font-bold text-brand text-xl mt-1 mb-2">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <BookButton />
          </div>
        </div>
      </section>
      <Reviews />
      <LocationsCTA />
      <CareersCTA />
    </>
  );
}
