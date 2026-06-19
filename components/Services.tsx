"use client";

import Link from "next/link";
import BookableImage from "./BookableImage";
import { ALL_SERVICES } from "@/lib/routes";

export default function Services() {
  return (
    <section id="services" className="site-section bg-section-gray">
      <div className="site-container">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="site-heading-section mb-4">
            Top-Rated by <span className="site-heading-pink">Pets &amp; Their People</span>
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            From nervous rescues to pampered pups, every pet gets our undivided attention. With
            professional care, loving hands, and stress-free sessions, it&apos;s no wonder we&apos;re
            a trusted part of the family.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ALL_SERVICES.map((card, index) => (
            <article key={card.title} className="site-card group overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden">
                <BookableImage
                  src={card.image}
                  alt={card.title}
                  bookable={index % 2 === 0}
                  objectPosition={card.imagePosition}
                  className="img-blog w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
      </div>
    </section>
  );
}
