import { REVIEWS } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";

export default function Reviews() {
  return (
    <section id="reviews" className="site-section bg-section-white">
      <div className="site-container">
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h2 className="site-heading-section mb-4">
            What our <span className="site-heading-pink">Customers</span> Say About Us
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Real feedback from pet parents across Orange County who trust us for calm,
            professional mobile grooming at the curb.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {REVIEWS.map((review) => (
            <article
              key={review.name}
              className="site-card p-6 md:p-8 border-t-4 border-accent h-full"
            >
              <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">
                &ldquo;{review.quote}&rdquo;
              </p>
              <p className="font-bold text-brand border-t border-accent/10 pt-4">{review.name}</p>
            </article>
          ))}
        </div>

        <p className="text-center mt-8">
          <a href={ROUTES.reviews} className="site-link">Read All Reviews</a>
        </p>
      </div>
    </section>
  );
}
