"use client";

import { useState } from "react";
import Link from "next/link";
import SmsOptInField from "@/components/SmsOptInField";
import { legalRoutes } from "@/lib/company-legal";
import { saveLead } from "@/lib/leads/client";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              const form = new FormData(e.currentTarget);
              await saveLead({
                funnelStep: "contact_info",
                fullName: String(form.get("name") ?? ""),
                email: String(form.get("email") ?? ""),
                phone,
                zipCode: String(form.get("zip") ?? ""),
                message: String(form.get("message") ?? ""),
                smsOptIn,
                source: "contact",
              });
              setSubmitting(false);
              setSubmitted(true);
            }}
          >
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Name *</label>
              <input
                required
                name="name"
                type="text"
                autoComplete="name"
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Email *</label>
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Phone *</label>
              <input
                required
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Zip Code</label>
              <input
                name="zip"
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-brand mb-1">Message</label>
              <textarea
                name="message"
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-[20px] focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none resize-none"
              />
            </div>
            <SmsOptInField checked={smsOptIn} onChange={setSmsOptIn} id="contact-sms-opt-in" />
            <p className="text-xs leading-relaxed text-gray-500">
              By submitting, you agree to our{" "}
              <Link href={legalRoutes.privacy} className="font-medium text-brand hover:text-accent">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href={legalRoutes.terms} className="font-medium text-brand hover:text-accent">
                Terms &amp; Conditions
              </Link>
              .
            </p>
            <button type="submit" disabled={submitting} className="site-btn w-full">
              {submitting ? "Sending…" : "Send Message"}
            </button>
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
