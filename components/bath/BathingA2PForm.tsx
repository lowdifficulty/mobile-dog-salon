"use client";

import { useState } from "react";

export default function BathingA2PForm() {
  const [phone, setPhone] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);

  return (
    <section className="site-section bg-section-gray border-y border-gray-100">
      <div className="site-container max-w-3xl">
        <h2 className="site-heading-section mb-2">Stay in touch</h2>
        <p className="text-gray-600 mb-6">
          Optional — add your mobile number for appointment reminders and updates from Mobile Dog
          Salon.
        </p>
        <div className="site-card p-6 space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number *
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(714) 555-0123"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              id="a2p-sms-opt-in"
              name="sms_opt_in"
              type="checkbox"
              checked={smsOptIn}
              onChange={(e) => setSmsOptIn(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand-bright/30"
            />
            <span className="text-sm text-gray-600 leading-relaxed">
              I agree to receive SMS messages from Mobile Dog Salon at the phone number provided
              above. Message frequency varies. Message and data rates may apply. Reply STOP to opt
              out or HELP for help.
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
