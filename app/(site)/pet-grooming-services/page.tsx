import type { Metadata } from "next";
import PageHero from "@/components/pages/PageHero";
import ServiceCardGrid from "@/components/pages/ServiceCardGrid";
import PackageCards from "@/components/pages/PackageCards";
import Reviews from "@/components/Reviews";
import BookButton from "@/components/BookButton";
import BulletList from "@/components/pages/BulletList";
import ContentSection from "@/components/pages/ContentSection";
import CareersCTA, { LocationsCTA } from "@/components/pages/PageCTAs";
import { SIT_STAY_BENEFITS } from "@/lib/constants";
import { SERVICE_PACKAGES, ALWAYS_INCLUDED } from "@/lib/page-content";

export const metadata: Metadata = {
  title: "Pet Grooming Services | Mobile Dog Salon",
  description: "Mobile pet spa, bathing, nail trimming, and deshedding services across Orange County.",
};

export default function ServicesPage() {
  return (
    <>
      <PageHero
        title={<>Top-Rated <span className="site-heading-pink">Pet Grooming</span> Services</>}
        subtitle="Salon-quality mobile grooming at your curb — spa, bathing, nails, and deshedding for dogs and cats across Orange County."
        background="blue"
      />
      <section className="site-section bg-section-gray">
        <div className="site-container">
          <h2 className="site-heading-section mb-10">Our Services</h2>
          <ServiceCardGrid />
        </div>
      </section>
      <section className="site-section bg-section-white">
        <div className="site-container">
          <h2 className="site-heading-section mb-4">Grooming Packages</h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-10">
            Transparent packages inspired by the best mobile groomers — choose what fits your pup, or book a full spa day.
            Final pricing depends on size, breed, and coat condition.
          </p>
          <PackageCards packages={SERVICE_PACKAGES} />
          <div className="text-center mt-10">
            <BookButton />
          </div>
        </div>
      </section>
      <ContentSection
        title="What's Always Included"
        bullets={ALWAYS_INCLUDED}
        bg="blue"
      />
      <section className="site-section bg-section-white">
        <div className="site-container max-w-3xl text-center">
          <h2 className="site-heading-section mb-6">Sit. Stay. We&apos;re on the way.</h2>
          <BulletList items={SIT_STAY_BENEFITS} />
        </div>
      </section>
      <Reviews />
      <LocationsCTA />
      <CareersCTA />
    </>
  );
}
