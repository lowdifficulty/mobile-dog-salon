import { SERVICES } from "@/lib/constants";
import BookButton from "./BookButton";

const iconMap: Record<string, React.ReactNode> = {
  bath: (
    <img src="https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=80&h=80&fit=crop" alt="" className="w-16 h-16 object-cover rounded-full" />
  ),
  products: (
    <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center text-blue">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    </div>
  ),
  brush: (
    <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center text-blue">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    </div>
  ),
  teeth: (
    <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center text-blue">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    </div>
  ),
  haircut: (
    <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center text-blue">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
      </svg>
    </div>
  ),
  nails: (
    <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center text-blue">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </div>
  ),
};

interface ServicesProps {
  onBookClick: () => void;
}

export default function Services({ onBookClick }: ServicesProps) {
  return (
    <section id="services" className="barkbus-section bg-[#E8F4FB]">
      <div className="barkbus-container">
        <div className="text-center mb-12">
          <h2 className="barkbus-heading mb-4">The Mobile Dog Salon Signature Service</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Every Mobile Dog Salon Signature Service is one-on-one with a gentle &amp;
            compassionate expert pet stylist
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-10 mb-12">
          {SERVICES.map((service) => (
            <div key={service.title} className="text-center">
              <div className="flex justify-center mb-4">{iconMap[service.icon]}</div>
              <h3 className="font-semibold text-gray-900 text-sm md:text-base leading-snug">
                {service.title}
              </h3>
            </div>
          ))}
        </div>

        <div className="text-center">
          <BookButton onClick={onBookClick} />
        </div>
      </div>
    </section>
  );
}
