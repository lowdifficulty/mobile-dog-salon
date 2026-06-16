import { ORANGE_COUNTY_CITIES } from "@/lib/constants";

export default function Locations() {
  return (
    <section id="locations" className="relative py-20 bg-blue-50 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue/10 rounded-full text-blue font-medium text-sm mb-4">
              Orange County, California
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              We Come to You
            </h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              From Huntington Beach to Yorba Linda, Irvine to Laguna Beach, Dana
              Point to San Clemente — Mobile Dog Salon proudly serves pet parents
              throughout Orange County. Our state-of-the-art mobile grooming vans
              come right to your driveway.
            </p>
            <p className="text-gray-500 text-sm">
              Don&apos;t see your neighborhood? Drop us a line — we&apos;re always
              adding new areas to our service routes!
            </p>
          </div>

          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-xl">
            <img
              src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&h=500&fit=crop"
              alt="Orange County California coastline"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-blue/20 to-blue-400/20" />
          </div>
        </div>

        <div className="mt-16">
          <h3 className="font-display text-2xl font-bold text-gray-900 mb-8 text-center">
            Cities We Serve
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {ORANGE_COUNTY_CITIES.map((city) => (
              <span
                key={city}
                className="px-4 py-2 bg-white text-blue-700 rounded-full text-sm font-medium border border-blue/20 hover:bg-blue hover:text-white transition-colors cursor-default shadow-sm"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
