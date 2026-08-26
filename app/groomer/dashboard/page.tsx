import { redirect } from "next/navigation";
import { getSession } from "@/lib/scheduling/auth";
import GroomerDashboard from "@/components/scheduling/GroomerDashboard";
import StaffSalesDashboard from "@/components/scheduling/StaffSalesDashboard";

export const metadata = {
  title: "Staff Dashboard | Mobile Dog Salon",
};

export default async function GroomerDashboardPage() {
  const session = await getSession();
  if (!session.user) {
    redirect("/groomer/login");
  }

  if (session.user.role === "staff") {
    return <StaffSalesDashboard user={session.user} />;
  }

  if (session.user.role !== "groomer") {
    redirect("/groomer/login");
  }

  return <GroomerDashboard user={session.user} />;
}
