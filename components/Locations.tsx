import Link from "next/link";
import { LOCATION_REGIONS, ORANGE_COUNTY_CITIES } from "@/lib/constants";

export default function Locations() {
  const region = LOCATION_REGIONS[0];

  return (
    <section id="locations" className="barkbus-section bg-[#E8F4FB]">
      <div className="barkbus-container">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <img
              src={region.image}
              alt="Orange County California"
              className="w-full h-40 object-cover"
            />
            <div className="p-5">
              <h3 className="font-display text-xl font-bold text-gray-900 mb-3">
                {region.name}
              </h3>
              <ul className="space-y-1 text-sm text-gray-700 mb-4">
                {region.areas.map((area) => (
                  <li key={area} className="font-medium">{area}</li>
                ))}
                {region.cities.map((city) => (
                  <li key={city}>{city}</li>
                ))}
              </ul>
              <Link
                href="#locations"
                className="inline-flex items-center gap-1 text-blue font-semibold text-sm hover:underline"
              >
                View All Locations
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-gray-600 mt-12 max-w-2xl mx-auto">
          Don&apos;t see where you live? We&apos;re rapidly expanding throughout Orange County,
          so drop us a line if you want us to service your area sooner!
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {ORANGE_COUNTY_CITIES.map((city) => (
            <span
              key={city}
              className="px-3 py-1.5 bg-white text-gray-700 rounded-full text-xs font-medium border border-gray-200"
            >
              {city}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
