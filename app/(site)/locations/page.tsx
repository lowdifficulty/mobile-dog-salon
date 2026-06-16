import type { Metadata } from "next";
import PageHero from "@/components/pages/PageHero";
import LocationRegions from "@/components/pages/LocationRegions";
import ContentSection from "@/components/pages/ContentSection";
import Reviews from "@/components/Reviews";
import CareersCTA from "@/components/pages/PageCTAs";
import { IMAGE_SLOTS } from "@/lib/images";
import { ORANGE_COUNTY_REGIONS, ALL_ORANGE_COUNTY_CITIES } from "@/lib/page-content";

export const metadata: Metadata = {
  title: "Locations | Mobile Dog Salon",
  description: "Mobile dog grooming across all of Orange County, CA — we come to your curb.",
};

export default function LocationsPage() {
  return (
    <>
      <PageHero
        title={<>Mobile Grooming Across <span className="site-heading-pink">Orange County</span></>}
        subtitle={`We serve pet families throughout Orange County — ${ALL_ORANGE_COUNTY_CITIES.length} cities and neighborhoods from Anaheim to San Clemente. Book online and we'll come to your driveway.`}
        image={IMAGE_SLOTS.locations}
        imageAlt="Mobile grooming in Orange County"
      />
      <ContentSection bg="white">
        <p className="text-gray-600 text-lg leading-relaxed mb-4">
          Mobile Dog Salon brings professional, cage-free grooming to your curb across the entire Orange County area.
          No more loading your pup into the car or waiting at a busy salon — we handle everything right at home.
        </p>
        <p className="text-gray-600 leading-relaxed">
          Whether you&apos;re in Irvine, Huntington Beach, Laguna Niguel, or anywhere in between, our mobile spas roll to you.
          Fast, affordable, and stress-free — that&apos;s how good dogs take baths in OC.
        </p>
      </ContentSection>
      <section className="site-section bg-section-blue">
        <div className="site-container">
          <h2 className="site-heading-section mb-4">Service Areas by Region</h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-10">
            We cover North, Central, Coastal, and South Orange County. Don&apos;t see your city? Book anyway — we may already be in your neighborhood.
          </p>
          <LocationRegions regions={ORANGE_COUNTY_REGIONS} />
        </div>
      </section>
      <section className="site-section bg-section-gray">
        <div className="site-container">
          <h2 className="site-heading-section mb-8">All Cities We Serve</h2>
          <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
            {ALL_ORANGE_COUNTY_CITIES.map((city) => (
              <span
                key={city}
                className="px-4 py-2 bg-white text-brand rounded-full text-sm font-semibold shadow-sm border border-accent/10"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      </section>
      <Reviews />
      <CareersCTA />
    </>
  );
}
