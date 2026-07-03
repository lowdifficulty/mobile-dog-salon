"use client";

import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  buildYahooCalendarUrl,
  type CalendarEventDetails,
} from "@/lib/calendar-links";

interface AddToCalendarButtonsProps {
  details: CalendarEventDetails;
}

const buttonClass =
  "booking-form-ghost-btn w-full flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-all";

export default function AddToCalendarButtons({ details }: AddToCalendarButtonsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Add to your calendar</p>
      <div className="flex flex-col gap-2">
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
      </div>
    </div>
  );
}
