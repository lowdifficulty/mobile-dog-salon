"use client";

import { SIT_STAY_BENEFITS } from "@/lib/constants";
import { IMAGE_SLOTS } from "@/lib/images";
import BookButton from "./BookButton";
import BookableImage from "./BookableImage";

export default function SitStay() {
  return (
    <section id="why" className="site-section bg-section-blue">
      <div className="site-container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <h2 className="site-heading-section site-heading-section-left !text-left mb-6">
              Sit. Stay.
              <br />
              <span className="site-heading-pink">We&apos;re on the way.</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              Our professional mobile groomers bring the pet spa to you — perfect for nervous
              pets, packed schedules, or families who just need a little help with dog grooming,
              cat grooming, and pet clipping.
            </p>

            <ul className="grid grid-cols-2 gap-3 mb-8">
              {SIT_STAY_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center gap-2 text-sm font-semibold text-brand">
                  <span className="site-check">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>

            <BookButton />
          </div>

          <div>
            <BookableImage
              src={IMAGE_SLOTS.sitStay}
              alt="Mobile grooming van at a customer's home"
              bookable
              sizes="(max-width: 1024px) 90vw, 384px"
              className="img-zoomin w-full aspect-[4/3] shadow-md ring-4 ring-white"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
