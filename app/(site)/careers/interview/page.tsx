import type { Metadata } from "next";
import InterviewBookingForm from "@/components/interviews/InterviewBookingForm";
import { INTERVIEW_PAY, INTERVIEW_ROLE_TITLE } from "@/lib/interviews/slots";

export const metadata: Metadata = {
  title: "Schedule Your Interview | Mobile Dog Salon Careers",
  description: `Book a 20-minute interview for ${INTERVIEW_ROLE_TITLE} at Mobile Dog Salon. ${INTERVIEW_PAY}.`,
};

export default function InterviewBookingPage() {
  return (
    <section className="interview-booking-fold bg-section-gray">
      <div className="site-container max-w-md mx-auto">
        <InterviewBookingForm
          intro={{
            roleTitle: INTERVIEW_ROLE_TITLE,
            payDescription: INTERVIEW_PAY,
          }}
        />
      </div>
    </section>
  );
}
