import type { Metadata } from "next";
import PageHero from "@/components/pages/PageHero";
import JobListings from "@/components/pages/JobListings";
import FAQSection from "@/components/pages/FAQSection";
import ContentSection from "@/components/pages/ContentSection";
import CareersCTA, { LocationsCTA } from "@/components/pages/PageCTAs";
import { ROUTES } from "@/lib/routes";
import { IMAGE_SLOTS } from "@/lib/images";
import { JOB_OPENINGS, CAREER_PERKS, CAREER_FAQS } from "@/lib/page-content";

export const metadata: Metadata = {
  title: "Careers | Mobile Dog Salon",
  description: "Join Mobile Dog Salon — hiring fleet service rep and part-time dog groomers at $30/hr commission in Orange County.",
};

export default function CareersPage() {
  return (
    <>
      <PageHero
        title={<>Join the <span className="site-heading-pink">Mobile Dog Salon</span> Team</>}
        subtitle="We're growing across Orange County and looking for passionate people who love pets, professionalism, and making good dogs look their best."
        image={IMAGE_SLOTS.careers}
        imageAlt="Happy groomed dog"
      />
      <section className="site-section bg-section-white">
        <div className="site-container max-w-3xl mx-auto text-center mb-4">
          <p className="text-gray-600 text-lg leading-relaxed">
            Currently hiring: <strong className="text-brand">1 Fleet Service Representative</strong> and{" "}
            <strong className="text-brand">2 Part-Time Dog Groomers</strong> at{" "}
            <strong className="text-accent">$30/hour commission</strong>.
          </p>
        </div>
        <div className="site-container">
          <h2 className="site-heading-section mb-10">Open Positions</h2>
          <JobListings jobs={JOB_OPENINGS} />
        </div>
      </section>
      <ContentSection
        title="Why Work With Us"
        bullets={CAREER_PERKS}
        bg="blue"
      />
      <section className="site-section bg-section-gray">
        <div className="site-container max-w-3xl mx-auto text-center">
          <h2 className="site-heading-section mb-6">Ready to Apply?</h2>
          <p className="text-gray-600 leading-relaxed mb-6">
            Click <strong>Apply for This Role</strong> on any open position above to submit your
            information and resume online. Groomer candidates can also{" "}
            <a href={ROUTES.interviewBooking} className="site-link font-semibold">
              schedule a 20-minute interview
            </a>{" "}
            for Tuesday, July 14 ($20/hour plus tips). You can also email{" "}
            <a href="mailto:careers@mobiledog-salon.com" className="site-link font-semibold">
              careers@mobiledog-salon.com
            </a>{" "}
            if you prefer.
          </p>
        </div>
      </section>
      <FAQSection faqs={CAREER_FAQS} />
      <LocationsCTA />
      <CareersCTA />
    </>
  );
}
