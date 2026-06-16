import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Mobile Dog Salon",
  description: "Mobile Dog Salon privacy policy.",
};

export default function PrivacyPage() {
  return (
    <section className="site-section bg-section-white">
      <div className="site-container max-w-3xl prose prose-gray">
        <h1 className="site-heading-hero mb-8">Privacy Policy</h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          Mobile Dog Salon respects your privacy. We collect information you provide when booking
          or contacting us — such as name, email, phone, and address — solely to schedule and
          perform grooming services.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          We do not sell your personal information. We may use your contact details to confirm
          appointments, send service updates, and respond to inquiries.
        </p>
        <p className="text-gray-600 leading-relaxed mb-4">
          For privacy questions, contact{" "}
          <a href="mailto:hello@mobiledog-salon.com" className="site-link">hello@mobiledog-salon.com</a>.
        </p>
        <p className="text-gray-500 text-sm">
          Last updated: {new Date().getFullYear()}
        </p>
      </div>
    </section>
  );
}
