import type { Metadata } from "next";
import Script from "next/script";
import { Caveat } from "next/font/google";
import { Quicksand } from "next/font/google";
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
    images: ["/images/branding-ad.png"],
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
        {children}
        <Script
          src="https://widgets.leadconnectorhq.com/loader.js"
          data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
          data-widget-id="6a022b8d5cec69da1232f673"
          data-source="WEB_USER"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
