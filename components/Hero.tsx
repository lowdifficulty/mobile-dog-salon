import Tagline from "@/components/Tagline";
import HeroBookButton from "./HeroBookButton";
import HeroBrandingImage from "./HeroBrandingImage";

export default function Hero() {
  return (
    <section className="bg-hero-spa site-section relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/25 rounded-full blur-3xl translate-x-1/4 translate-y-1/4" />
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#0f2447]/35 rounded-full blur-3xl -translate-x-1/4 -translate-y-1/4" />

      <div className="site-container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
            <Tagline size="hero" className="mb-6" />
            <p className="text-white/95 text-base md:text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0 font-medium drop-shadow-sm">
              Fast, affordable, and right at your driveway. No more stressful drop offs and long
              wait times. Book a spa day for your loved one today.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <HeroBookButton />
            </div>
          </div>

          <div className="relative">
            <HeroBrandingImage />
          </div>
        </div>
      </div>
    </section>
  );
}
