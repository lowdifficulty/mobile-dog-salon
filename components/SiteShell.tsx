"use client";

import BookingProvider from "@/components/BookingProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <BookingProvider>
      <Header />
      <main>{children}</main>
      <Footer />
    </BookingProvider>
  );
}
