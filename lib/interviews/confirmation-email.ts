import "server-only";
import { Resend } from "resend";
import { companyLegal } from "@/lib/company-legal";
import {
  formatInterviewDateLong,
  INTERVIEW_LOCATION,
  INTERVIEW_LOCATION_DETAIL,
  INTERVIEW_MANAGER_EMAIL,
} from "./slots";
import { buildInterviewIcsEvent, interviewDurationLabel } from "./ics";
import type { InterviewBooking } from "./types";

const ORGANIZER_EMAIL =
  process.env.BOOKING_ORGANIZER_EMAIL ?? "bookings@mobiledog-salon.com";

function emailFromAddress(): string {
  return process.env.BOOKING_EMAIL_FROM ?? `Mobile Dog Salon <${ORGANIZER_EMAIL}>`;
}

function candidateEmailHtml(booking: InterviewBooking): string {
  const dateLine = formatInterviewDateLong(booking.date);
  return `
    <p>Hi ${booking.fullName.split(" ")[0] || booking.fullName},</p>
    <p>Your interview for <strong>${booking.roleTitle}</strong> at Mobile Dog Salon is confirmed.</p>
    <p>
      <strong>When:</strong> ${dateLine}<br/>
      <strong>Time:</strong> ${booking.time} Pacific (${interviewDurationLabel()})<br/>
      <strong>Role:</strong> ${booking.roleTitle}<br/>
      <strong>Pay:</strong> ${booking.payDescription}<br/>
      <strong>Location:</strong> ${INTERVIEW_LOCATION}<br/>
      <em>${INTERVIEW_LOCATION_DETAIL}</em>
    </p>
    <p>Open the attached calendar invite to add this interview to your calendar.</p>
    <p>Questions? Reply to this email or call us at ${companyLegal.businessPhoneDisplay}.</p>
    <p>— Mobile Dog Salon</p>
  `;
}

function managerEmailHtml(booking: InterviewBooking): string {
  const dateLine = formatInterviewDateLong(booking.date);
  return `
    <p><strong>New groomer interview booked</strong></p>
    <p>
      <strong>When:</strong> ${dateLine} at ${booking.time} Pacific<br/>
      <strong>Candidate:</strong> ${booking.fullName}<br/>
      <strong>Phone:</strong> ${booking.phone}<br/>
      <strong>Email:</strong> ${booking.email}<br/>
      <strong>Role:</strong> ${booking.roleTitle}<br/>
      <strong>Pay:</strong> ${booking.payDescription}
    </p>
    <p>Open the attached calendar invite to add this to your calendar.</p>
  `;
}

export async function sendInterviewConfirmationEmails(
  booking: InterviewBooking
): Promise<{ candidate: boolean; manager: boolean }> {
  if (!process.env.RESEND_API_KEY) {
    console.log("Interview emails skipped (RESEND_API_KEY not set)");
    console.log("Candidate ICS:\n", buildInterviewIcsEvent(booking, { attendeeEmail: booking.email }));
    console.log("Manager notify:", INTERVIEW_MANAGER_EMAIL);
    return { candidate: false, manager: false };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = emailFromAddress();
  const dateLine = formatInterviewDateLong(booking.date);

  const candidateIcs = buildInterviewIcsEvent(booking, {
    attendeeEmail: booking.email,
    method: "REQUEST",
  });
  const managerIcs = buildInterviewIcsEvent(booking, {
    attendeeEmail: INTERVIEW_MANAGER_EMAIL,
    method: "REQUEST",
  });

  const [candidateResult, managerResult] = await Promise.allSettled([
    resend.emails.send({
      from,
      to: booking.email,
      subject: `Interview confirmed — ${booking.roleTitle} on ${dateLine}`,
      html: candidateEmailHtml(booking),
      attachments: [
        {
          filename: "interview.ics",
          content: Buffer.from(candidateIcs).toString("base64"),
          contentType: "text/calendar; method=REQUEST",
        },
      ],
    }),
    resend.emails.send({
      from,
      to: INTERVIEW_MANAGER_EMAIL,
      subject: `Interview booked: ${booking.fullName} — ${dateLine} ${booking.time}`,
      html: managerEmailHtml(booking),
      attachments: [
        {
          filename: "interview.ics",
          content: Buffer.from(managerIcs).toString("base64"),
          contentType: "text/calendar; method=REQUEST",
        },
      ],
    }),
  ]);

  if (candidateResult.status === "rejected") {
    console.error("Interview candidate email failed:", candidateResult.reason);
  }
  if (managerResult.status === "rejected") {
    console.error("Interview manager email failed:", managerResult.reason);
  }

  return {
    candidate: candidateResult.status === "fulfilled",
    manager: managerResult.status === "fulfilled",
  };
}
