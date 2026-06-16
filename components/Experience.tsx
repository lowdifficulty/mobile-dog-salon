export default function Experience() {
  return (
    <section id="experience" className="relative py-20 bg-blue-50 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
            See the Mobile Dog Salon Experience
          </h2>
        </div>

        <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-video max-w-4xl mx-auto bg-blue-800">
          <img
            src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&h=675&fit=crop"
            alt="Mobile Dog Salon grooming experience"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-blue-900/30 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
              <svg className="w-8 h-8 text-blue ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
