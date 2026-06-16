import type { Metadata } from "next";
import PageHero from "@/components/pages/PageHero";
import BulletList from "@/components/pages/BulletList";
import Reviews from "@/components/Reviews";
import BookButton from "@/components/BookButton";
import CareersCTA, { LocationsCTA } from "@/components/pages/PageCTAs";

export const metadata: Metadata = {
  title: "Why Mobile Dog Salon | Orange County Mobile Grooming",
  description: "Why choose mobile pet grooming? Convenience, comfort, and cage-free care at your curb.",
};

const mobileBenefits = [
  "No stressful car rides",
  "No cages or barking rooms",
  "One-on-one attention",
  "Perfect for anxious pets",
];

const petTypes = [
  "Puppies & kittens",
  "Senior pets",
  "Anxious rescues",
  "Large breeds",
  "Multi-pet households",
  "Cats & dogs",
];

export default function WhyPage() {
  return (
    <>
      <PageHero
        title={<>Why <span className="site-heading-pink">Mobile Dog Salon</span></>}
        subtitle="Mobile grooming brings salon-quality care to your curb — calmer for pets, easier for you."
        background="tan"
      />
      <section className="site-section bg-section-white">
        <div className="site-container max-w-3xl">
          <h2 className="site-heading-section mb-8">Why Mobile Pet Grooming</h2>
          <BulletList items={mobileBenefits} />
        </div>
      </section>
      <section className="site-section bg-section-blue">
        <div className="site-container max-w-3xl">
          <h2 className="site-heading-section mb-8">A Spa Day For Any Pet</h2>
          <BulletList items={petTypes} />
          <div className="mt-8 text-center">
            <BookButton />
          </div>
        </div>
      </section>
      <Reviews />
      <section className="site-section bg-section-gray">
        <div className="site-container max-w-3xl text-center">
          <h2 className="site-heading-section mb-4">Happy Groomers, Happy Pets</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Our groomers love what they do — and that shows in every tail wag and purr.
          </p>
        </div>
      </section>
      <LocationsCTA />
      <CareersCTA />
    </>
  );
}
