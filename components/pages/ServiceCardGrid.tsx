import Link from "next/link";
import { ALL_SERVICES } from "@/lib/routes";

export default function ServiceCardGrid({ excludeHref }: { excludeHref?: string }) {
  const services = excludeHref
    ? ALL_SERVICES.filter((s) => s.href !== excludeHref)
    : ALL_SERVICES;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {services.map((card) => (
        <article key={card.title} className="site-card group overflow-hidden">
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={card.image}
              alt={card.title}
              className="img-blog w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              style={card.imagePosition ? { objectPosition: card.imagePosition } : undefined}
            />
          </div>
          <div className="p-5 border-t-4 border-accent">
            <h3 className="font-bold text-brand text-lg mb-2">{card.title}</h3>
            <p className="text-gray-600 text-sm mb-4">{card.description}</p>
            <Link href={card.href} className="site-link text-sm">
              Learn More &gt;
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ExploreOtherServices({ currentHref }: { currentHref: string }) {
  return (
    <section className="site-section bg-section-gray">
      <div className="site-container">
        <h2 className="site-heading-section mb-10">Explore Other Services</h2>
        <ServiceCardGrid excludeHref={currentHref} />
      </div>
    </section>
  );
}
