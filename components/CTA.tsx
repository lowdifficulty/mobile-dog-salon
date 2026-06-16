interface CTAProps {
  onBookClick: () => void;
}

export default function CTA({ onBookClick }: CTAProps) {
  return (
    <section className="relative py-20 bg-blue overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Book your &ldquo;spaw&rdquo; day now!
        </h2>
        <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
          Give your pup the luxury grooming experience they deserve — right at
          your doorstep in Orange County.
        </p>
        <button
          onClick={onBookClick}
          className="inline-flex items-center gap-2 px-10 py-5 bg-white text-blue font-bold rounded-full hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-lg"
        >
          Book Online Now
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </div>
    </section>
  );
}
