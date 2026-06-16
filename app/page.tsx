"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Reviews from "@/components/Reviews";
import FiveStar from "@/components/FiveStar";
import Services from "@/components/Services";
import Benefits from "@/components/Benefits";
import Experience from "@/components/Experience";
import FAQ from "@/components/FAQ";
import Locations from "@/components/Locations";
import About from "@/components/About";
import CTA from "@/components/CTA";
import BookingModal from "@/components/BookingModal";

export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false);

  const openBooking = () => setBookingOpen(true);
  const closeBooking = () => setBookingOpen(false);

  return (
    <>
      <Header onBookClick={openBooking} />
      <main>
        <Hero onBookClick={openBooking} />
        <Reviews />
        <FiveStar />
        <Services onBookClick={openBooking} />
        <Benefits />
        <Experience />
        <FAQ />
        <Locations />
        <About onBookClick={openBooking} />
        <CTA onBookClick={openBooking} />
      </main>
      <Footer onBookClick={openBooking} />
      <BookingModal isOpen={bookingOpen} onClose={closeBooking} />
    </>
  );
}
