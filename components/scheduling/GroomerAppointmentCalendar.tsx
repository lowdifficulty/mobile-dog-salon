import StaffAppointmentCalendar from "./StaffAppointmentCalendar";
import type { GroomerId } from "@/lib/scheduling/types";

export default function GroomerAppointmentCalendar({
  groomerId,
  refreshKey = 0,
}: {
  groomerId: GroomerId;
  refreshKey?: number;
}) {
  return (
    <StaffAppointmentCalendar mode="groomer" groomerId={groomerId} refreshKey={refreshKey} />
  );
}
