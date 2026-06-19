"use client";

import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  buildYahooCalendarUrl,
  downloadIcsFile,
  type CalendarEventDetails,
} from "@/lib/calendar-links";

interface AddToCalendarButtonsProps {
  details: CalendarEventDetails;
}

const buttonClass =
  "inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-brand transition-all hover:border-brand hover:bg-brand/5";

export default function AddToCalendarButtons({ details }: AddToCalendarButtonsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Add to your calendar</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <a
          href={buildGoogleCalendarUrl(details)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          Google
        </a>
        <a
          href={buildOutlookCalendarUrl(details)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          Outlook
        </a>
        <a
          href={buildYahooCalendarUrl(details)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          Yahoo
        </a>
        <button
          type="button"
          onClick={() => downloadIcsFile(details)}
          className={`${buttonClass} col-span-2 sm:col-span-1`}
        >
          Apple / .ics
        </button>
      </div>
    </div>
  );
}
