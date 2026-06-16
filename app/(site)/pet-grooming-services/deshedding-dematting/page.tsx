import type { Metadata } from "next";
import ServiceDetailPage from "@/components/pages/ServiceDetailPage";
import { ROUTES } from "@/lib/routes";
import { IMAGE_SLOTS } from "@/lib/images";
import { SERVICE_CONTENT } from "@/lib/page-content";

const content = SERVICE_CONTENT.deshedding;

export const metadata: Metadata = {
  title: "Deshedding & Dematting | Mobile Dog Salon",
  description: "Mobile deshedding and dematting treatments across Orange County — less fur at home, healthier coats.",
};

export default function DesheddingPage() {
  return (
    <ServiceDetailPage
      title={<>Deshedding & <span className="site-heading-pink">Dematting</span></>}
      subtitle="Remove undercoat, reduce shedding, and restore a soft, healthy coat — at your curb."
      image={IMAGE_SLOTS.serviceDeshed}
      intro={content.intro}
      bullets={content.why}
      included={content.included}
      idealFor={content.idealFor}
      faqs={content.faqs}
      currentHref={ROUTES.deshedding}
    />
  );
}
