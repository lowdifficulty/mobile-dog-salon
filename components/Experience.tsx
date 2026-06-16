export default function Experience() {
  return (
    <section id="experience" className="barkbus-section bg-[#E8F4FB]">
      <div className="barkbus-container">
        <h2 className="barkbus-heading text-center mb-10">
          See the Mobile Dog Salon Experience
        </h2>

        <div className="relative rounded-2xl overflow-hidden aspect-video max-w-4xl mx-auto bg-gray-900 shadow-xl">
          <img
            src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=1200&h=675&fit=crop"
            alt="Mobile Dog Salon grooming experience"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
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
