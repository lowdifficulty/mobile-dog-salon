"use client";

import { useState } from "react";
import SmsOptInField from "@/components/SmsOptInField";

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
            <label htmlFor="a2p-phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number *
            </label>
            <input
              id="a2p-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(714) 555-0123"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none"
            />
          </div>
          <SmsOptInField
            checked={smsOptIn}
            onChange={setSmsOptIn}
            id="a2p-sms-opt-in"
          />
        </div>
      </div>
    </section>
  );
}
