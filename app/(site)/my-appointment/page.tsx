import type { Metadata } from "next";
import MyAppointmentPanel from "@/components/my-appointment/MyAppointmentPanel";

export const metadata: Metadata = {
  title: "My Appointment | Mobile Dog Salon",
  description:
    "Look up your mobile dog grooming appointment by phone number to reschedule or cancel.",
};

export default function MyAppointmentPage() {
  return <MyAppointmentPanel />;
}
