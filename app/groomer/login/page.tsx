import SchedulingLoginForm from "@/components/scheduling/SchedulingLoginForm";

export const metadata = {
  title: "Groomer Login | Mobile Dog Salon",
};

export default function GroomerLoginPage() {
  return (
    <SchedulingLoginForm
      role="groomer"
      title="Groomer login"
      subtitle="Melanie and Diamond — set your availability and view appointments."
      loginPath="/groomer/login"
      dashboardPath="/groomer/dashboard"
    />
  );
}
