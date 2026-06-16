"use client";

import { useState } from "react";

interface FAQ {
  question: string;
  answer: string;
}

export default function FAQSection({ faqs, title = "Frequently Asked Questions" }: { faqs: FAQ[]; title?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="site-section bg-section-white">
      <div className="site-container max-w-3xl">
        <h2 className="site-heading-section mb-10">{title}</h2>
        <div className="divide-y divide-gray-200 border-t border-gray-200">
          {faqs.map((faq, index) => (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between py-5 text-left group"
              >
                <span className="font-semibold text-brand pr-4">{faq.question}</span>
                <span className="text-2xl text-accent font-light leading-none shrink-0">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <p className="pb-5 text-gray-600 leading-relaxed">{faq.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
