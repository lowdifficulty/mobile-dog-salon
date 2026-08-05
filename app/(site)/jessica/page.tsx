import type { Metadata } from "next";
import HomePageSections from "@/components/HomePageSections";
import { OG_SHARE_IMAGE } from "@/lib/images";
import { ROUTES } from "@/lib/routes";

const SITE_URL = "https://mobiledog-salon.com";
const TITLE = "Mobile Dog Salon | Book with Jessica — Whittier & LA County";
const DESCRIPTION =
  "Book mobile dog grooming with Jessica in Whittier and nearby LA County. Good Dogs Take Baths — spa day at your curb, fast and stress-free.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}${ROUTES.jessica}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: `${SITE_URL}${ROUTES.jessica}`,
    siteName: "Mobile Dog Salon",
    locale: "en_US",
    images: [
      {
        url: OG_SHARE_IMAGE,
        width: 1200,
        height: 1200,
        alt: "Mobile Dog Salon — book grooming with Jessica in Whittier",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_SHARE_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function JessicaLandingPage() {
  return <HomePageSections />;
}
