import type { Metadata } from "next";
import ServiceDetailPage from "@/components/pages/ServiceDetailPage";
import { ROUTES } from "@/lib/routes";
import { IMAGE_SLOTS } from "@/lib/images";
import { SERVICE_CONTENT } from "@/lib/page-content";

const content = SERVICE_CONTENT.mobileSpa;

export const metadata: Metadata = {
  title: "Mobile Pet Spa & Salon | Mobile Dog Salon",
  description: "Full-service mobile pet spa and salon grooming at your curb in Orange County.",
};

export default function MobileSpaPage() {
  return (
    <ServiceDetailPage
      title={<>Mobile Pet <span className="site-heading-pink">Spa & Salon</span></>}
      subtitle="Salon-quality full grooming at your curb — baths, haircuts, and spa care without the drive."
      image={IMAGE_SLOTS.serviceSpa}
      intro={content.intro}
      bullets={content.why}
      included={content.included}
      idealFor={content.idealFor}
      faqs={content.faqs}
      currentHref={ROUTES.mobileSpa}
    />
  );
}
