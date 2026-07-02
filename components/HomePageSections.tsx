import dynamic from "next/dynamic";
import Hero from "@/components/Hero";
import HeroLcpPreload from "@/components/HeroLcpPreload";

const SitStay = dynamic(() => import("@/components/SitStay"));
const Services = dynamic(() => import("@/components/Services"));
const LovedByPets = dynamic(() => import("@/components/LovedByPets"));
const GroomersVans = dynamic(() => import("@/components/GroomersVans"));
const Reviews = dynamic(() => import("@/components/Reviews"));
const HowItWorks = dynamic(() => import("@/components/HowItWorks"));
const Locations = dynamic(() => import("@/components/Locations"));
const Careers = dynamic(() => import("@/components/Careers"));
const Blog = dynamic(() => import("@/components/Blog"));

/** Home page sections — reused on /la and /oc ad landing pages. */
export default function HomePageSections() {
  return (
    <>
      <HeroLcpPreload />
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
