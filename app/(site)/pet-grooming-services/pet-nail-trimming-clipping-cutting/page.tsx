import type { Metadata } from "next";
import ServiceDetailPage from "@/components/pages/ServiceDetailPage";
import { ROUTES } from "@/lib/routes";
import { IMAGE_SLOTS } from "@/lib/images";
import { SERVICE_CONTENT } from "@/lib/page-content";

const content = SERVICE_CONTENT.nails;

export const metadata: Metadata = {
  title: "Pet Nail Trimming | Mobile Dog Salon",
  description: "Calm, one-on-one mobile nail trimming at your curb in Orange County.",
};

export default function NailsPage() {
  return (
    <ServiceDetailPage
      title={<>Pet <span className="site-heading-pink">Nail Trimming</span></>}
      subtitle="Trim, file, and paw pad care in a quiet mobile environment — no salon stress."
      image={IMAGE_SLOTS.serviceNails}
      intro={content.intro}
      bullets={content.why}
      included={content.included}
      idealFor={content.idealFor}
      faqs={content.faqs}
      currentHref={ROUTES.nails}
    />
  );
}
