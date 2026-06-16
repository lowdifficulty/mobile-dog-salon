import { redirect } from "next/navigation";
import { getSession } from "@/lib/scheduling/auth";
import AdminDashboard from "@/components/scheduling/AdminDashboard";

export const metadata = {
  title: "Admin Dashboard | Mobile Dog Salon",
};

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session.user || session.user.role !== "admin") {
    redirect("/admin/login");
  }

  return <AdminDashboard />;
}
