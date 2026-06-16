import type { Metadata } from "next";
import PageHero from "@/components/pages/PageHero";
import BulletList from "@/components/pages/BulletList";
import BookButton from "@/components/BookButton";
import { HOW_IT_WORKS_STEPS } from "@/lib/constants";
import { PHONE_HREF, PHONE_NUMBER } from "@/lib/constants";
import CareersCTA, { LocationsCTA } from "@/components/pages/PageCTAs";

export const metadata: Metadata = {
  title: "How It Works | Mobile Dog Salon",
  description: "Book mobile dog grooming in Orange County — we come to your driveway for calm, cage-free spa care.",
};

const differentiators = [
  "One-on-one the entire session",
  "No cages or waiting rooms",
  "Professional groomers at your curb",
  "Eco-friendly products",
  "Flexible scheduling",
  "Orange County wide service",
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title={<>How <span className="site-heading-pink">It Works</span></>}
        subtitle="Perfect for busy pet parents, anxious animals, or anyone who'd rather skip the trip — expert care simple, personal, and right at your doorstep."
        background="hero"
      />
      <section className="site-section bg-section-white">
        <div className="site-container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <div key={step.title} className="site-card p-6 text-center">
                <div className="site-step-badge">{i + 1}</div>
                <h3 className="font-bold text-brand mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <BookButton />
          </div>
        </div>
      </section>
      <section className="site-section bg-section-blue">
        <div className="site-container max-w-3xl">
          <h2 className="site-heading-section mb-8">What Makes It Different</h2>
          <BulletList items={differentiators} />
        </div>
      </section>
      <section className="site-section bg-section-gray text-center">
        <div className="site-container">
          <p className="text-gray-600 mb-4">Prefer to call?</p>
          <a href={PHONE_HREF} className="text-2xl font-bold text-accent hover:underline">
            {PHONE_NUMBER}
          </a>
        </div>
      </section>
      <LocationsCTA />
      <CareersCTA />
    </>
  );
}
