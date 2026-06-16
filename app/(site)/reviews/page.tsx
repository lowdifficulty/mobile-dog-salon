import type { Metadata } from "next";
import Reviews from "@/components/Reviews";
import PageHero from "@/components/pages/PageHero";
import CareersCTA, { LocationsCTA } from "@/components/pages/PageCTAs";
import { REVIEWS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Reviews | Mobile Dog Salon",
  description: "Read what Orange County pet parents say about Mobile Dog Salon mobile grooming.",
};

export default function ReviewsPage() {
  return (
    <>
      <PageHero
        title={<>What our <span className="site-heading-pink">Customers</span> Say</>}
        subtitle="Real reviews from pet parents across Orange County who trust Mobile Dog Salon for calm, professional mobile grooming."
        background="pattern-blue"
      />
      <section className="site-section bg-section-white">
        <div className="site-container">
          <div className="grid sm:grid-cols-2 gap-6">
            {REVIEWS.map((review) => (
              <article key={review.name} className="site-card img-review-card p-8 bg-cream border-t-4 border-accent">
                <p className="text-gray-700 leading-relaxed mb-4 italic">&ldquo;{review.quote}&rdquo;</p>
                <p className="font-bold text-brand">— {review.name}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Reviews />
      <LocationsCTA />
      <CareersCTA />
    </>
  );
}
