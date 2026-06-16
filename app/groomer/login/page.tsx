import SchedulingLoginForm from "@/components/scheduling/SchedulingLoginForm";

export const metadata = {
  title: "Groomer Login | Mobile Dog Salon",
};

export default function GroomerLoginPage() {
  return (
    <SchedulingLoginForm
      role="groomer"
      title="Groomer login"
      subtitle="Melanie and Diamond — select your name and sign in to manage availability and appointments."
      loginPath="/groomer/login"
      dashboardPath="/groomer/dashboard"
    />
  );
}
