export default function Benefits() {
  return (
    <section className="relative py-20 bg-blue-50 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">
            We are giving you your day back
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] group">
            <img
              src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=450&fit=crop"
              alt="Happy relaxed dog after grooming"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <h3 className="font-display text-xl font-bold text-white mb-2">
                Saving your dog from cages and salon stress
              </h3>
              <p className="text-white/80 text-sm">
                No more hours in a cage surrounded by barking dogs. Your pup gets
                one-on-one attention in our mobile spa van.
              </p>
            </div>
          </div>

          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] group">
            <img
              src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&h=450&fit=crop"
              alt="Mobile grooming van at customer's home"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <h3 className="font-display text-xl font-bold text-white mb-2">
                and delivering you peace of mind and convenience
              </h3>
              <p className="text-white/80 text-sm">
                We come to you — no driving, no waiting rooms. Enjoy your day
                while we pamper your pup at your doorstep.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
