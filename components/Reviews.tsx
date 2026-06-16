import { REVIEWS } from "@/lib/constants";

function Stars({ size = "md" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className={`${cls} text-blue`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Reviews() {
  return (
    <section className="barkbus-section bg-white">
      <div className="barkbus-container">
        <div className="text-center mb-8">
          <Stars />
          <h2 className="barkbus-heading-section mt-4">What Our Clients Are Saying</h2>
          <div className="flex items-center justify-center gap-3 mt-3 text-sm text-gray-500">
            <span>Google</span>
            <span>Yelp</span>
            <span className="font-semibold text-blue">5 stars</span>
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto hide-scrollbar snap-x snap-mandatory pb-2 -mx-5 px-5 md:mx-0 md:px-0">
          {REVIEWS.map((review) => (
            <article
              key={review.name}
              className="snap-start shrink-0 w-[85%] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] bg-[#E8F4FB] rounded-2xl p-6 md:p-8"
            >
              <Stars size="sm" />
              <h3 className="font-semibold text-gray-900 mt-4 mb-2 text-lg leading-snug">
                {review.headline}
              </h3>
              <p className="text-gray-600 text-sm mb-6">{review.text}</p>
              <div className="border-t border-blue/20 pt-4">
                <p className="font-semibold text-gray-900">- {review.name}</p>
                <p className="text-xs text-gray-500 mt-1">Verified Customer</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
