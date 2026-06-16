export default function Benefits() {
  return (
    <section className="barkbus-section bg-white">
      <div className="barkbus-container">
        <h2 className="barkbus-heading text-center mb-10 md:mb-14">
          We are giving you your day back
        </h2>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <img
              src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=700&h=500&fit=crop"
              alt="Dog groomer saving a dog from dog cage"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h3 className="font-display text-xl md:text-2xl font-bold text-white">
                Saving your dog from cages and salon stress
              </h3>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <img
              src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=700&h=500&fit=crop"
              alt="Woman relaxing with Mobile Dog Salon grooming van"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h3 className="font-display text-xl md:text-2xl font-bold text-white">
                and delivering you peace of mind and convenience
              </h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
