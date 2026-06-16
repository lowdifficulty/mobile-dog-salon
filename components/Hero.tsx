import Tagline from "@/components/Tagline";
import BookButton from "./BookButton";
import BookableBrandingHeroImage from "./BookableBrandingHeroImage";

export default function Hero() {
  return (
    <section className="bg-section-pink site-section relative overflow-hidden">
      <div className="absolute top-10 left-10 w-24 h-24 bg-white/20 rounded-full blur-2xl" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-brand-sky/30 rounded-full blur-3xl" />

      <div className="site-container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="text-center lg:text-left">
            <Tagline size="hero" className="mb-6" />
            <p className="text-white/95 text-base md:text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0 font-medium">
              Fast, affordable, and right at your driveway. No more stressful drop offs and long
              wait times. Book a spa day for your loved one today.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-3">
              <BookButton />
            </div>
          </div>

          <div className="relative">
            <BookableBrandingHeroImage className="rounded-[30px] ring-4 ring-white/80" />
          </div>
        </div>
      </div>
    </section>
  );
}
