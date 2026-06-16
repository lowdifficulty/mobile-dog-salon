"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { IMAGE_SLOTS } from "@/lib/images";
import BookableImage from "./BookableImage";

export default function GroomersVans() {
  return (
    <>
      <section id="groomers" className="site-section bg-section-blue">
        <div className="site-container">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div>
              <h2 className="site-heading-section site-heading-section-left !text-left mb-6">
                The Best <span className="site-heading-pink">Pet Grooming</span> Professionals
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Our talented groomers bring salon-level experience to your front door — building real
                relationships with your pet that make visits feel more like play dates.
              </p>
              <Link href={ROUTES.ourGroomers} className="site-link">Learn More</Link>
            </div>
            <div>
              <BookableImage
                src={IMAGE_SLOTS.groomers}
                alt="Professional pet groomer with a happy dog"
                bookable
                className="img-zoomin w-full aspect-[4/3] shadow-md ring-4 ring-white"
              />
            </div>
          </div>
        </div>
      </section>

      <section id="vans" className="site-section bg-section-gray">
        <div className="site-container">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="lg:order-2">
              <h2 className="site-heading-section site-heading-section-left !text-left mb-6">
                State-of-the-Art <span className="site-heading-pink">Mobile Pet Spas</span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                Our mobile spas offer quiet, one-on-one grooming sessions without the chaos — no
                cages, no barking rooms, just clean, calming care that pets actually enjoy.
              </p>
              <Link href={ROUTES.ourVans} className="site-link">Learn More</Link>
            </div>
            <div className="lg:order-1">
              <BookableImage
                src={IMAGE_SLOTS.vans}
                alt="State-of-the-art mobile grooming van"
                bookable={false}
                className="img-zoomin w-full aspect-[4/3] shadow-md ring-4 ring-accent/15"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
