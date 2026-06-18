import type { Metadata } from "next";
import ServiceDetailPage from "@/components/pages/ServiceDetailPage";
import BathingA2PForm from "@/components/bath/BathingA2PForm";
import BookPageA2PScript from "@/components/book/BookPageA2PScript";
import { ROUTES } from "@/lib/routes";
import { IMAGE_SLOTS } from "@/lib/images";
import { SERVICE_CONTENT } from "@/lib/page-content";

const content = SERVICE_CONTENT.bathing;

export const metadata: Metadata = {
  title: "Pet Bathing & Washing | Mobile Dog Salon",
  description: "Professional mobile pet bathing at your curb in Orange County — warm filtered baths with all-natural products.",
};

export default function BathingPage() {
  return (
    <div className="a2p-verification-page">
      <ServiceDetailPage
        title={<>Pet <span className="site-heading-pink">Bathing & Washing</span></>}
        subtitle="Warm filtered baths, quality products, and a professional finish — right at your driveway."
        image={IMAGE_SLOTS.serviceBath}
        intro={content.intro}
        bullets={content.why}
        included={content.included}
        idealFor={content.idealFor}
        faqs={content.faqs}
        currentHref={ROUTES.bathing}
        hideBookButtons
      />
      <BathingA2PForm />
      <BookPageA2PScript />
    </div>
  );
}
