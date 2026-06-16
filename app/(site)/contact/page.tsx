import type { Metadata } from "next";
import ContactForm from "./ContactForm";
import PageHero from "@/components/pages/PageHero";
import CareersCTA from "@/components/pages/PageCTAs";

export const metadata: Metadata = {
  title: "Contact | Mobile Dog Salon",
  description: "Contact Mobile Dog Salon for mobile dog grooming in Orange County.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        title={<>Get in <span className="site-heading-pink">Touch</span></>}
        subtitle="Questions about mobile grooming in Orange County? We'd love to hear from you."
        background="hero"
      />
      <ContactForm />
      <CareersCTA />
    </>
  );
}
