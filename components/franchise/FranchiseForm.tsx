"use client";

import { useState } from "react";
import {
  FRANCHISE_CANDIDATE_TYPES,
  FRANCHISE_INVESTMENT_OPTIONS,
  FRANCHISE_TIMELINES,
} from "@/lib/franchise-content";

const inputClass =
  "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none text-gray-900 bg-white";
const labelClass = "block text-sm font-semibold text-brand mb-1.5";

export default function FranchiseForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/franchise/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          phone: form.get("phone"),
          city: form.get("city"),
          state: form.get("state"),
          desiredTerritory: form.get("desiredTerritory"),
          isGroomer: form.get("isGroomer"),
          groomPlan: form.get("groomPlan"),
          ownsVan: form.get("ownsVan"),
          investmentCapital: form.get("investmentCapital"),
          interestedInFinancing: form.get("interestedInFinancing"),
          candidateType: form.get("candidateType"),
          timeline: form.get("timeline"),
          interestReason: form.get("interestReason"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not submit your request.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-white shadow-xl border border-gray-100 p-8 sm:p-10 text-center">
        <h3 className="text-xl font-bold text-brand mb-2">Thank you!</h3>
        <p className="text-gray-600 leading-relaxed">
          A member of the Mobile Dog Salon team will follow up with more franchise information.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white shadow-xl border border-gray-100 p-6 sm:p-8 lg:p-10 space-y-5"
    >
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="franchise-first-name">First name *</label>
          <input required id="franchise-first-name" name="firstName" type="text" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="franchise-last-name">Last name *</label>
          <input required id="franchise-last-name" name="lastName" type="text" className={inputClass} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="franchise-email">Email *</label>
          <input required id="franchise-email" name="email" type="email" autoComplete="email" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="franchise-phone">Phone *</label>
          <input required id="franchise-phone" name="phone" type="tel" autoComplete="tel" className={inputClass} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="franchise-city">City *</label>
          <input required id="franchise-city" name="city" type="text" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="franchise-state">State *</label>
          <input required id="franchise-state" name="state" type="text" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="franchise-territory">Desired territory *</label>
        <input
          required
          id="franchise-territory"
          name="desiredTerritory"
          type="text"
          placeholder="City, county, or ZIP codes"
          className={inputClass}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="franchise-is-groomer">Are you currently a dog groomer? *</label>
          <select required id="franchise-is-groomer" name="isGroomer" className={inputClass} defaultValue="">
            <option value="" disabled>Select one</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="franchise-groom-plan">
            Do you plan to groom yourself or hire groomers? *
          </label>
          <select required id="franchise-groom-plan" name="groomPlan" className={inputClass} defaultValue="">
            <option value="" disabled>Select one</option>
            <option value="Groom myself">Groom myself</option>
            <option value="Hire groomers">Hire groomers</option>
            <option value="Both">Both</option>
            <option value="Not sure yet">Not sure yet</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="franchise-owns-van">Do you currently own a grooming van? *</label>
          <select required id="franchise-owns-van" name="ownsVan" className={inputClass} defaultValue="">
            <option value="" disabled>Select one</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="franchise-financing">Interested in financing? *</label>
          <select
            required
            id="franchise-financing"
            name="interestedInFinancing"
            className={inputClass}
            defaultValue=""
          >
            <option value="" disabled>Select one</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
            <option value="Maybe">Maybe / exploring options</option>
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="franchise-investment">Estimated available investment capital *</label>
          <select required id="franchise-investment" name="investmentCapital" className={inputClass} defaultValue="">
            <option value="" disabled>Select one</option>
            {FRANCHISE_INVESTMENT_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="franchise-candidate-type">Candidate type *</label>
          <select required id="franchise-candidate-type" name="candidateType" className={inputClass} defaultValue="">
            <option value="" disabled>Select one</option>
            {FRANCHISE_CANDIDATE_TYPES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="franchise-timeline">Timeline to launch *</label>
        <select required id="franchise-timeline" name="timeline" className={inputClass} defaultValue="">
          <option value="" disabled>Select one</option>
          {FRANCHISE_TIMELINES.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="franchise-interest">
          Why are you interested in Mobile Dog Salon? *
        </label>
        <textarea
          required
          id="franchise-interest"
          name="interestReason"
          rows={4}
          className={`${inputClass} resize-none`}
        />
      </div>

      <button type="submit" disabled={submitting} className="site-btn w-full sm:w-auto">
        {submitting ? "Submitting…" : "Request Franchise Information"}
      </button>
    </form>
  );
}
