import { PRESS_LOGOS } from "@/lib/constants";

export default function FiveStar() {
  return (
    <section className="py-12 md:py-16 bg-white border-y border-gray-100">
      <div className="barkbus-container text-center">
        <div className="flex items-center justify-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-6 h-6 text-blue" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <h2 className="barkbus-heading-section mb-8">
          Five Star Experience
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 opacity-70">
          {PRESS_LOGOS.map((name) => (
            <span key={name} className="text-sm md:text-base font-bold text-gray-500 uppercase tracking-wide">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
