import type { Metadata } from "next";
import HomePageSections from "@/components/HomePageSections";
import { OG_SHARE_IMAGE } from "@/lib/images";
import { ROUTES } from "@/lib/routes";

const SITE_URL = "https://mobiledog-salon.com";
const TITLE = "Mobile Dog Salon | Good Dogs Take Baths — Los Angeles County";
const DESCRIPTION =
  "Good Dogs Take Baths! Professional mobile dog grooming at your curb across LA County. Book a spa day for your pup — fast, affordable, and stress-free.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}${ROUTES.la}` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: `${SITE_URL}${ROUTES.la}`,
    siteName: "Mobile Dog Salon",
    locale: "en_US",
    images: [
      {
        url: OG_SHARE_IMAGE,
        width: 1200,
        height: 1200,
        alt: "Mobile Dog Salon — Good Dogs Take Baths mobile grooming in Los Angeles County",
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

export default function LaLandingPage() {
  return <HomePageSections />;
}
