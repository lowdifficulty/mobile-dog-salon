"use client";

import { useState } from "react";
import BookButton from "./BookButton";
import { PHONE_HREF, SMS_HREF } from "@/lib/constants";

interface HeroProps {
  onBookClick: () => void;
}

export default function Hero({ onBookClick }: HeroProps) {
  const [bookingExpanded, setBookingExpanded] = useState(false);

  return (
    <section className="bg-[#E8F4FB] barkbus-section">
      <div className="barkbus-container">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div>
            <h1 className="barkbus-heading mb-6">
              Mobile Dog
              <br />
              Salon
            </h1>

            <BookButton onClick={onBookClick} className="mb-8" />

            <div>
              <p className="text-sm text-gray-600 mb-3">How do you want to book?</p>
              <button
                type="button"
                onClick={() => setBookingExpanded(!bookingExpanded)}
                className="flex lg:hidden items-center gap-3 text-gray-800 font-medium mb-4"
              >
                <span className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center text-lg leading-none">
                  {bookingExpanded ? "−" : "+"}
                </span>
              </button>

              <div className={`flex flex-wrap gap-3 ${bookingExpanded ? "flex" : "hidden"} lg:flex`}>
                  <a href={SMS_HREF} className="barkbus-btn-outline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Text us
                  </a>
                  <button type="button" onClick={onBookClick} className="barkbus-btn-outline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Chat with us
                  </button>
                  <a href={PHONE_HREF} className="barkbus-btn-outline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call us
                  </a>
                  <button type="button" onClick={onBookClick} className="barkbus-btn-outline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Book online
                  </button>
                </div>

              <a href={PHONE_HREF} className="inline-block mt-6 text-blue font-semibold hover:underline">
                Call Now
              </a>
            </div>
          </div>

          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=900&h=700&fit=crop"
              alt="People holding a dog with a Mobile Dog Salon groomer"
              className="w-full rounded-2xl object-cover aspect-[4/3] shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
