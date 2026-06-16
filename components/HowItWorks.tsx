import { HOW_IT_WORKS_STEPS } from "@/lib/constants";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="site-section bg-section-blue">
      <div className="site-container">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="site-heading-section mb-4">
            How <span className="site-heading-pink">it Works</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            Perfect for busy pet parents, anxious animals, or anyone who&apos;d rather skip the
            trip — Mobile Dog Salon makes expert care simple, personal, and right at your doorstep.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {HOW_IT_WORKS_STEPS.map((step, index) => (
            <div
              key={step.title}
              className="site-card p-6 text-center"
            >
              <div className="site-step-badge">{index + 1}</div>
              <h3 className="font-bold text-brand mb-2">{step.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <p className="text-center">
          <a href="#how-it-works" className="site-link">Learn More</a>
        </p>
      </div>
    </section>
  );
}
