import { NextResponse } from "next/server";
import {
  applySlotAvailability,
  formatInterviewDateLong,
  INTERVIEW_PAY,
  INTERVIEW_ROLE_TITLE,
  listInterviewSlotDefinitions,
} from "@/lib/interviews/slots";
import { getBookedInterviewSlotKeys } from "@/lib/interviews/store";

export async function GET() {
  const booked = await getBookedInterviewSlotKeys();
  const slots = applySlotAvailability(listInterviewSlotDefinitions(), booked);

  return NextResponse.json({
    date: slots[0]?.date,
    dateLabel: slots[0]?.date ? formatInterviewDateLong(slots[0].date) : "",
    roleTitle: INTERVIEW_ROLE_TITLE,
    payDescription: INTERVIEW_PAY,
    slots,
  });
}
