export interface InterviewBooking {
  id: string;
  slotKey: string;
  date: string;
  time: string;
  fullName: string;
  email: string;
  phone: string;
  roleTitle: string;
  payDescription: string;
  bookedAt: string;
}

export interface InterviewBookingInput {
  slotKey: string;
  fullName: string;
  email: string;
  phone: string;
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
  payDescription: string;
  slotKey: string;
}
