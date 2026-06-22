"use client";

import { useState } from "react";
import type { JobOpening } from "@/lib/page-content";

const inputClass =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-bright/30 focus:border-brand-bright outline-none";

async function fileToResumePayload(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    dataBase64: btoa(binary),
  };
}

export default function JobApplicationModal({
  job,
  onClose,
}: {
  job: JobOpening;
  onClose: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const resume = resumeFile ? await fileToResumePayload(resumeFile) : undefined;
      const res = await fetch("/api/careers/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          jobTitle: job.title,
          fullName,
          email,
          phone,
          message,
          resume,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not submit application");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="site-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="job-apply-title"
      >
        {submitted ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-bold text-xl text-brand mb-2">Application sent!</h3>
            <p className="text-sm text-gray-600 mb-6">
              Thanks for applying for <strong>{job.title}</strong>. We&apos;ll review your
              application and get back to you soon.
            </p>
            <button type="button" onClick={onClose} className="site-btn">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">
                  Job application
                </p>
                <h3 id="job-apply-title" className="font-bold text-xl text-brand">
                  {job.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="apply-name" className="block text-xs font-medium text-gray-700 mb-1">
                  Full name *
                </label>
                <input
                  id="apply-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="apply-email" className="block text-xs font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  id="apply-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="apply-phone" className="block text-xs font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  id="apply-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="apply-message" className="block text-xs font-medium text-gray-700 mb-1">
                  Cover letter / introduction *
                </label>
                <textarea
                  id="apply-message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us why you'd be a great fit for this role and any relevant experience."
                  className={`${inputClass} resize-y min-h-[120px]`}
                />
              </div>
              <div>
                <label htmlFor="apply-resume" className="block text-xs font-medium text-gray-700 mb-1">
                  Resume (PDF or Word, optional, max 3 MB)
                </label>
                <input
                  id="apply-resume"
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-light file:text-brand hover:file:bg-brand/10"
                />
                {resumeFile && (
                  <p className="text-xs text-gray-500 mt-1">{resumeFile.name}</p>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="site-btn w-full disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
