export default function About() {
  return (
    <section id="about" className="barkbus-section bg-[#E8F4FB]">
      <div className="barkbus-container">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <img
            src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=700&h=500&fit=crop"
            alt="Two people sitting on the grass with a happy dog"
            className="w-full rounded-2xl object-cover aspect-[4/3] shadow-md"
          />

          <div>
            <h2 className="barkbus-heading mb-6">We love what we do!</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              The entire Mobile Dog Salon team love dogs, love people and love people who love
              their dogs! At Mobile Dog Salon, we aim to bring the convenience of mobile grooming
              to pet parents throughout Orange County. We are focused on bringing world class Pet
              Stylists to your doorstep to provide an elegant, consistent and safe spa day for
              your adorable pups.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
