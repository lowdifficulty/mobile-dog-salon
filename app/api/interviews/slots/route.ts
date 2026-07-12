import { NextResponse } from "next/server";
import {
  applySlotAvailability,
  formatInterviewDateLong,
  INTERVIEW_PAY,
  INTERVIEW_ROLE_TITLE,
  isInterviewDate,
  listInterviewDateOptions,
  listInterviewSlotDefinitions,
  resolveActiveInterviewDate,
} from "@/lib/interviews/slots";
import { getBookedInterviewSlotKeys } from "@/lib/interviews/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const booked = await getBookedInterviewSlotKeys();

  if (date) {
    if (!isInterviewDate(date)) {
      return NextResponse.json({ error: "Invalid interview date" }, { status: 400 });
    }

    const slots = applySlotAvailability(listInterviewSlotDefinitions(date), booked);
    return NextResponse.json({
      date,
      dateLabel: formatInterviewDateLong(date),
      roleTitle: INTERVIEW_ROLE_TITLE,
      payDescription: INTERVIEW_PAY,
      slots,
    });
  }

  const dates = listInterviewDateOptions(booked);
  const active = resolveActiveInterviewDate(dates);
  const slots = active
    ? applySlotAvailability(listInterviewSlotDefinitions(active.date), booked)
    : [];

  return NextResponse.json({
    roleTitle: INTERVIEW_ROLE_TITLE,
    payDescription: INTERVIEW_PAY,
    dates,
    activeDate: active?.date ?? null,
    dateLabel: active?.dateLabel ?? "",
    slots,
  });
}
