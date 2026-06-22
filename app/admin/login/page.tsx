import SchedulingLoginForm from "@/components/scheduling/SchedulingLoginForm";

export const metadata = {
  title: "Admin Login | Mobile Dog Salon",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function AdminLoginPage() {
  return (
    <SchedulingLoginForm
      role="admin"
      title="Admin login"
      subtitle="View groomer availability and all appointments."
      loginPath="/admin/login"
      dashboardPath="/admin/dashboard"
    />
  );
}
