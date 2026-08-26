import { redirect } from "next/navigation";
import { getSession } from "@/lib/scheduling/auth";
import GroomerConversationOpener from "@/components/scheduling/GroomerConversationOpener";

export const metadata = {
  title: "Open conversation | Mobile Dog Salon",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ code: string }> };

export default async function GroomerConversationLinkPage({ params }: PageProps) {
  const { code } = await params;
  const normalized = code.trim().toLowerCase();
  if (!/^[a-z0-9]{6,12}$/.test(normalized)) {
    redirect("/groomer/dashboard");
  }

  const session = await getSession();
  const returnPath = `/groomer/c/${normalized}`;
  if (!session.user) {
    redirect(`/groomer/login?next=${encodeURIComponent(returnPath)}`);
  }

  if (session.user.role !== "groomer" && session.user.role !== "staff") {
    redirect("/groomer/login?next=" + encodeURIComponent(returnPath));
  }

  return <GroomerConversationOpener code={normalized} />;
}
