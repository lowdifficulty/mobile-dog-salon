import type { Metadata } from "next";
import { BRANDING_AD, OG_SHARE_IMAGE } from "@/lib/images";
import { ROUTES } from "@/lib/routes";
import { SITE_URL } from "@/lib/site-url";

/** Browser tab + Google */
export const FRANCHISE_TITLE =
  "Own a Mobile Dog Grooming Franchise | Mobile Dog Salon";

/** Social cards — shorter, scannable headline */
export const FRANCHISE_OG_TITLE = "Own a Mobile Dog Grooming Franchise";

/** Full pitch for Open Graph / Twitter / iMessage previews */
export const FRANCHISE_SHARE_DESCRIPTION =
  "Start a mobile dog grooming business with Mobile Dog Salon. Franchise package includes brand, used van sourcing, booking software, CRM, scheduling, routing, Twilio communication, analytics, training, and launch support.";

/** Meta description — ~155 characters for search snippets */
export const FRANCHISE_META_DESCRIPTION =
  "Start a mobile dog grooming franchise with Mobile Dog Salon. Brand, van sourcing, software, CRM, marketing, training, and launch support in one package.";

export const FRANCHISE_KEYWORDS = [
  "mobile dog grooming franchise",
  "mobile pet grooming franchise",
  "dog grooming franchise",
  "own a mobile dog grooming business",
  "mobile dog salon franchise",
  "pet grooming franchise opportunity",
  "mobile grooming business",
  "franchise van sourcing",
  "dog grooming franchise cost",
  "SBA franchise financing",
];

export const FRANCHISE_PAGE_URL = `${SITE_URL}${ROUTES.franchise}`;

export const FRANCHISE_OG_IMAGES = [
  {
    url: BRANDING_AD,
    width: 1200,
    height: 1200,
    alt: "Mobile Dog Salon franchise — Good Dogs Take Baths mobile grooming brand",
    type: "image/png",
  },
  {
    url: OG_SHARE_IMAGE,
    width: 1200,
    height: 1200,
    alt: "Mobile Dog Salon — Good Dogs Take Baths mobile dog grooming",
    type: "image/jpeg",
  },
] as const;

export function franchiseMetadata(): Metadata {
  return {
    title: FRANCHISE_TITLE,
    description: FRANCHISE_META_DESCRIPTION,
    keywords: FRANCHISE_KEYWORDS,
    applicationName: "Mobile Dog Salon",
    alternates: { canonical: FRANCHISE_PAGE_URL },
    openGraph: {
      title: FRANCHISE_OG_TITLE,
      description: FRANCHISE_SHARE_DESCRIPTION,
      type: "website",
      url: FRANCHISE_PAGE_URL,
      siteName: "Mobile Dog Salon",
      locale: "en_US",
      images: [...FRANCHISE_OG_IMAGES],
    },
    twitter: {
      card: "summary_large_image",
      title: FRANCHISE_OG_TITLE,
      description: FRANCHISE_SHARE_DESCRIPTION,
      images: [BRANDING_AD, OG_SHARE_IMAGE],
    },
    robots: { index: true, follow: true },
  };
}

export function franchiseJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${FRANCHISE_PAGE_URL}#webpage`,
        url: FRANCHISE_PAGE_URL,
        name: FRANCHISE_TITLE,
        description: FRANCHISE_SHARE_DESCRIPTION,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: "Mobile Dog Salon",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "Mobile Dog Salon",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}${OG_SHARE_IMAGE}`,
        },
        description: "Mobile dog grooming franchise and Orange County mobile pet spa services.",
      },
      {
        "@type": "Service",
        name: "Mobile Dog Salon Franchise",
        description: FRANCHISE_SHARE_DESCRIPTION,
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: { "@type": "Country", name: "United States" },
        url: FRANCHISE_PAGE_URL,
      },
    ],
  };
}
