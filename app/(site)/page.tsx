import type { Metadata } from "next";
import Hero from "@/components/Hero";
import SitStay from "@/components/SitStay";
import Services from "@/components/Services";
import LovedByPets from "@/components/LovedByPets";
import GroomersVans from "@/components/GroomersVans";
import Reviews from "@/components/Reviews";
import HowItWorks from "@/components/HowItWorks";
import Locations from "@/components/Locations";
import Careers from "@/components/Careers";
import Blog from "@/components/Blog";
import { OG_SHARE_IMAGE } from "@/lib/images";

const SITE_URL = "https://mobiledog-salon.com";
const HOME_TITLE = "Mobile Dog Salon | Good Dogs Take Baths — Orange County";
const HOME_DESCRIPTION =
  "Good Dogs Take Baths! Professional mobile dog grooming at your curb across Orange County. Book a spa day for your pup — fast, affordable, and stress-free.";

export const metadata: Metadata = {
  title: HOME_TITLE,
  description: HOME_DESCRIPTION,
  keywords: [
    "mobile dog grooming",
    "Orange County dog grooming",
    "mobile pet grooming",
    "dog grooming near me",
    "Good Dogs Take Baths",
    "Irvine dog grooming",
    "Huntington Beach dog grooming",
  ],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: "Mobile Dog Salon",
    locale: "en_US",
    images: [
      {
        url: OG_SHARE_IMAGE,
        width: 1200,
        height: 1200,
        alt: "Mobile Dog Salon — Good Dogs Take Baths mobile grooming in Orange County",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [OG_SHARE_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <>
      <Hero />
      <SitStay />
      <Services />
      <LovedByPets />
      <GroomersVans />
      <Reviews />
      <HowItWorks />
      <Locations />
      <Careers />
      <Blog />
    </>
  );
}
