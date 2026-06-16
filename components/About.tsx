interface AboutProps {
  onBookClick: () => void;
}

export default function About({ onBookClick }: AboutProps) {
  return (
    <section id="about" className="relative py-20 bg-white overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-xl order-2 lg:order-1">
            <img
              src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=700&h=500&fit=crop"
              alt="Happy dog with groomer"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              We love what we do!
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              The entire Mobile Dog Salon team loves dogs, loves people, and loves
              people who love their dogs! We aim to bring the convenience of mobile
              grooming to pet parents throughout Orange County. We are focused on
              bringing world-class Pet Stylists to your doorstep to provide an
              elegant, consistent, and safe spa day for your adorable pups.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              Every appointment is one-on-one — no cages, no other dogs, no salon
              stress. Just a gentle, compassionate expert pet stylist and your
              furry best friend enjoying a luxurious grooming experience.
            </p>
            <button
              onClick={onBookClick}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue text-white font-semibold rounded-full hover:bg-blue-600 transition-all shadow-lg hover:shadow-xl"
            >
              Book Online Now
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
