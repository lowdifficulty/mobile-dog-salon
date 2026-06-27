import FranchisePageContent from "@/components/franchise/FranchisePageContent";
import { franchiseJsonLd, franchiseMetadata } from "@/lib/franchise-metadata";

export const metadata = franchiseMetadata();

export default function FranchisePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(franchiseJsonLd()) }}
      />
      <FranchisePageContent />
    </>
  );
}
