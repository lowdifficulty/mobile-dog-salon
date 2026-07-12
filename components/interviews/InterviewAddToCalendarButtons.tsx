"use client";

import {
  buildInterviewGoogleCalendarUrl,
  buildInterviewOutlookCalendarUrl,
  buildInterviewYahooCalendarUrl,
  downloadInterviewIcsFile,
  type InterviewCalendarDetails,
} from "@/lib/interviews/calendar-links";

interface InterviewAddToCalendarButtonsProps {
  details: InterviewCalendarDetails;
}

const buttonClass =
  "w-full flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold border border-gray-200 bg-white text-gray-800 hover:border-brand hover:text-brand transition-all";

export default function InterviewAddToCalendarButtons({
  details,
}: InterviewAddToCalendarButtonsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Add to your calendar</p>
      <div className="flex flex-col gap-2">
        <a
          href={buildInterviewGoogleCalendarUrl(details)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          Google Calendar
        </a>
        <a
          href={buildInterviewOutlookCalendarUrl(details)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          Outlook
        </a>
        <a
          href={buildInterviewYahooCalendarUrl(details)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          Yahoo
        </a>
        <button
          type="button"
          onClick={() => downloadInterviewIcsFile(details)}
          className={buttonClass}
        >
          Apple / Download .ics
        </button>
      </div>
    </div>
  );
}
