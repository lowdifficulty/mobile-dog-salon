import { ORANGE_COUNTY_CITIES } from "@/lib/constants";
import BookButton from "./BookButton";

export default function Locations() {
  return (
    <section id="locations" className="site-section bg-section-gray">
      <div className="site-container">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="site-heading-section mb-4">
            Everywhere <span className="site-heading-pink">Pets Need Us</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            We serve neighborhoods and cities across Orange County. From large dogs in the
            suburbs to pampered cats in the city, we bring calm, clean mobile pet grooming care
            to your curb.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {ORANGE_COUNTY_CITIES.map((city) => (
            <span
              key={city}
              className="px-4 py-2 bg-white text-brand rounded-full text-sm font-semibold border border-accent/20 shadow-sm hover:border-accent hover:text-accent transition-colors"
            >
              {city}
            </span>
          ))}
        </div>

        <div className="text-center">
          <BookButton />
        </div>
      </div>
    </section>
  );
}
