import type { Metadata } from "next";
import InterviewBookingForm from "@/components/interviews/InterviewBookingForm";
import { INTERVIEW_ROLE_TITLE } from "@/lib/interviews/slots";

export const metadata: Metadata = {
  title: "Schedule Your Interview | Mobile Dog Salon Careers",
  description: `Book a 30-minute interview for ${INTERVIEW_ROLE_TITLE} at Mobile Dog Salon. Mon–Thu, 11 AM–2 PM Pacific.`,
};

export default function InterviewBookingPage() {
  return (
    <section className="interview-booking-fold bg-section-gray">
      <div className="site-container max-w-md mx-auto">
        <InterviewBookingForm
          intro={{
            roleTitle: INTERVIEW_ROLE_TITLE,
          }}
        />
      </div>
    </section>
  );
}
