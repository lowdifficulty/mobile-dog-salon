import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mobile Dog Salon | Luxury Mobile Dog Grooming in Orange County",
  description:
    "Premium mobile dog grooming that comes to your doorstep in Orange County. One-on-one, stress-free grooming with no cages. Book your appointment today!",
  keywords:
    "mobile dog grooming, Orange County, dog grooming, mobile pet grooming, Irvine, Huntington Beach, Newport Beach",
  openGraph: {
    title: "Mobile Dog Salon | Luxury Mobile Dog Grooming in Orange County",
    description:
      "Luxury mobile dog grooming that comes to you. Serving all of Orange County.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={figtree.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
