import { redirect } from "next/navigation";
import { getSession } from "@/lib/scheduling/auth";
import GroomerDashboard from "@/components/scheduling/GroomerDashboard";

export const metadata = {
  title: "Groomer Dashboard | Mobile Dog Salon",
};

export default async function GroomerDashboardPage() {
  const session = await getSession();
  if (!session.user || session.user.role !== "groomer") {
    redirect("/groomer/login");
  }

  return <GroomerDashboard user={session.user} />;
}
