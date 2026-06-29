import ClientHub from "@/components/client/ClientHub";
import { Suspense } from "react";

export const metadata = {
  title: "Client Portal | Mobile Dog Salon",
};

export default function ClientPortalPage() {
  return (
    <Suspense fallback={<p className="p-8 text-gray-500">Loading…</p>}>
      <ClientHub />
    </Suspense>
  );
}
