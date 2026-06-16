"use client";

import { useState } from "react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <section className="site-section bg-section-white">
      <div className="site-container max-w-xl mx-auto">
        {submitted ? (
          <div className="text-center p-8 site-card">
            <h2 className="font-bold text-brand text-xl mb-2">Thank you!</h2>
            <p className="text-gray-600">We&apos;ll get back to you shortly.</p>
          </div>
        ) : (
          <form
            className="site-card p-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Name</label>
              <input
                required
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Email</label>
              <input
                required
                type="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Zip Code</label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Phone</label>
              <input
                type="tel"
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Message</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none resize-none"
              />
            </div>
            <button type="submit" className="site-btn w-full">Send Message</button>
          </form>
        )}
        <p className="text-center text-gray-600 mt-8">
          Orange County, California<br />
          <a href="mailto:hello@mobiledog-salon.com" className="site-link">hello@mobiledog-salon.com</a>
        </p>
      </div>
    </section>
  );
}
