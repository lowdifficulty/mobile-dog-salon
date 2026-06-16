"use client";

import { useState } from "react";
import { REVIEWS } from "@/lib/constants";
import { ROUTES } from "@/lib/routes";

function ReviewCard({
  review,
}: {
  review: { name: string; petQuote: string; humanQuote: string };
}) {
  const [translated, setTranslated] = useState(false);

  return (
    <article className="snap-start shrink-0 w-[85%] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] site-card p-6 md:p-8 border-t-4 border-accent">
      <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">
        &ldquo;{translated ? review.humanQuote : review.petQuote}&rdquo;
      </p>
      <div className="flex items-center justify-between border-t border-accent/10 pt-4">
        <p className="font-bold text-brand">{review.name}</p>
        <button
          type="button"
          onClick={() => setTranslated(!translated)}
          className="text-sm font-bold text-accent hover:underline"
        >
          {translated ? "Show Pet Language" : "Translate"}
        </button>
      </div>
    </article>
  );
}

export default function Reviews() {
  return (
    <section id="reviews" className="site-section bg-section-white">
      <div className="site-container">
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <h2 className="site-heading-section mb-4">
            What our <span className="site-heading-pink">Customers</span> Say About Us
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            While pets can&apos;t write reviews, their reactions — wagging tails, purring, zoomies,
            or side-eye stares — say everything we need to know.
          </p>
        </div>

        <div className="flex gap-5 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2 -mx-5 px-5 md:mx-0 md:px-0">
          {REVIEWS.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </div>

        <p className="text-center mt-8">
          <a href={ROUTES.reviews} className="site-link">Read All Reviews</a>
        </p>
      </div>
    </section>
  );
}
