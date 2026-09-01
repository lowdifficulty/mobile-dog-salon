export type InterviewOutcome = "continue" | "declined";

export type InterviewApplicationStatus = "booked" | "complete";

export interface GroomPhoto {
  id: string;
  fileName: string;
  mimeType: string;
  dataBase64: string;
  uploadedAt: string;
}

export interface InterviewBooking {
  id: string;
  slotKey: string;
  date: string;
  time: string;
  fullName: string;
  email: string;
  phone: string;
  roleTitle: string;
  /** @deprecated Legacy bookings may include payDescription */
  payDescription?: string;
  yearsExperience: number;
  bookedAt: string;
  /** Admin review: continue keeps the booking green; declined turns it red. */
  outcome?: InterviewOutcome;
  groomPhotos?: GroomPhoto[];
  applicationStatus?: InterviewApplicationStatus;
  completedAt?: string;
}

export interface InterviewBookingInput {
  slotKey: string;
  fullName: string;
  email: string;
  phone: string;
  yearsExperience: number;
}

export interface InterviewBookingsData {
  bookings: InterviewBooking[];
}

export interface InterviewCalendarDetails {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  roleTitle: string;
  /** @deprecated Legacy bookings may include payDescription */
  payDescription?: string;
  slotKey: string;
}
