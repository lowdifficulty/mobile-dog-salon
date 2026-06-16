"use client";

import { useState } from "react";
import { FAQS } from "@/lib/constants";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="barkbus-section bg-white">
      <div className="barkbus-container max-w-3xl">
        <h2 className="barkbus-heading text-center mb-10">
          Frequently Asked Questions
        </h2>

        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {FAQS.map((faq, index) => (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between py-5 text-left group"
              >
                <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                <span className="text-2xl text-gray-400 font-light leading-none shrink-0">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <p className="pb-5 text-gray-600 leading-relaxed">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>

        <p className="text-center mt-8">
          <a href="#faq" className="text-blue font-semibold hover:underline">
            Read more FAQ&apos;s
          </a>
        </p>
      </div>
    </section>
  );
}
