import BookButton from "../BookButton";
import type { BookingVariantId } from "@/lib/booking/variants";

interface Region {
  name: string;
  description: string;
  cities: string[];
}

export default function LocationRegions({
  regions,
  bookingVariant,
}: {
  regions: Region[];
  bookingVariant?: BookingVariantId;
}) {
  return (
    <div className="space-y-10">
      {regions.map((region) => (
        <div key={region.name} className="site-card p-6 md:p-8 border-t-4 border-brand">
          <h3 className="font-bold text-brand text-xl mb-2">{region.name}</h3>
          <p className="text-gray-600 text-sm mb-4">{region.description}</p>
          <div className="flex flex-wrap gap-2">
            {region.cities.map((city) => (
              <span
                key={city}
                className="px-3 py-1.5 bg-section-gray text-brand rounded-full text-sm font-semibold border border-accent/15"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div className="text-center pt-4">
        <BookButton bookingVariant={bookingVariant} />
      </div>
    </div>
  );
}
