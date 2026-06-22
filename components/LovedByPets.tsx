"use client";

import { PET_TYPES } from "@/lib/constants";
import { IMAGE_SLOTS } from "@/lib/images";
import BookButton from "./BookButton";
import BookableImage from "./BookableImage";

export default function LovedByPets() {
  return (
    <section className="site-section bg-section-white">
      <div className="site-container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <BookableImage
              src={IMAGE_SLOTS.lovedByPets}
              alt="Happy dog after grooming"
              bookable={false}
              sizes="(max-width: 1024px) 90vw, 384px"
              className="img-zoomin w-full aspect-[4/3] shadow-md ring-4 ring-accent/15"
            />
          </div>

          <div>
            <h2 className="site-heading-section site-heading-section-left !text-left mb-6">
              Loved by <span className="site-heading-pink">Pets &amp; Owners</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Mobile grooming is a game-changer for busy families, senior pet owners, multi-pet
              households, and anyone with anxious or travel-averse pets — bringing comfort, care,
              and convenience to every doorstep.
            </p>

            <ul className="grid grid-cols-2 gap-3 mb-8">
              {PET_TYPES.map((type) => (
                <li key={type} className="flex items-center gap-2 text-sm font-semibold text-brand">
                  <span className="site-check">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  {type}
                </li>
              ))}
            </ul>

            <BookButton />
          </div>
        </div>
      </div>
    </section>
  );
}
