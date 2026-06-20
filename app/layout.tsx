import type { Metadata } from "next";
import { Caveat } from "next/font/google";
import { Quicksand } from "next/font/google";
import MetaPixel from "@/components/analytics/MetaPixel";
import GoogleTag from "@/components/analytics/GoogleTag";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mobiledog-salon.com"),
  title: "Mobile Dog Salon | Good Dogs Take Baths — Orange County",
  description:
    "Good Dogs Take Baths! Cute, professional mobile dog grooming in your driveway across Orange County. Meet Licky, Hattie, and all our good dogs.",
  keywords:
    "mobile dog grooming, Orange County, Good Dogs Take Baths, dog grooming, Irvine, Huntington Beach",
  openGraph: {
    title: "Mobile Dog Salon | Good Dogs Take Baths",
    description:
      "Good Dogs Take Baths — mobile pet grooming that comes to your curb in Orange County.",
    type: "website",
    siteName: "Mobile Dog Salon",
    locale: "en_US",
    images: [
      {
        url: "/images/og-home-square.jpg",
        width: 1200,
        height: 1200,
        alt: "Mobile Dog Salon — Good Dogs Take Baths",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mobile Dog Salon | Good Dogs Take Baths",
    description:
      "Good Dogs Take Baths — mobile pet grooming that comes to your curb in Orange County.",
    images: ["/images/og-home-square.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${quicksand.variable} ${caveat.variable}`}>
      <body className="font-sans">
        <GoogleTag />
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
