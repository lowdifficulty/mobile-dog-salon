import SchedulingLoginForm from "@/components/scheduling/SchedulingLoginForm";

export const metadata = {
  title: "Groomer Login | Mobile Dog Salon",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function GroomerLoginPage() {
  return (
    <SchedulingLoginForm
      role="groomer"
      title="Groomer login"
      subtitle="Melanie, Diamond, Jessica, and Chris — sign in to manage availability and appointments on the Nissan or Dodge van."
      loginPath="/groomer/login"
      dashboardPath="/groomer/dashboard"
    />
  );
}
