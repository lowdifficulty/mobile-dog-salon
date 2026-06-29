import { IMAGE_SLOTS } from "@/lib/images";

export const ROUTES = {
  home: "/",
  book: "/book",
  bookCats: "/book-cats",
  about: "/about",
  ourGroomers: "/about/our-groomers",
  ourVans: "/about/our-vans",
  reviews: "/reviews",
  careers: "/careers",
  locations: "/locations",
  services: "/pet-grooming-services",
  mobileSpa: "/pet-grooming-services/mobile-spa-salon-haircuts",
  bathing: "/pet-grooming-services/pet-bathing-washing",
  nails: "/pet-grooming-services/pet-nail-trimming-clipping-cutting",
  deshedding: "/pet-grooming-services/deshedding-dematting",
  howItWorks: "/how-it-works",
  why: "/why-mobile-dog-salon",
  blog: "/blog",
  franchise: "/franchise",
  contact: "/contact",
  privacy: "/privacy-policy",
  terms: "/terms-and-conditions",
  groomerLogin: "/groomer/login",
  clientLogin: "/client/login",
  clientHub: "/client/portal",
  clientRegister: "/client/register",
  /** @deprecated use clientLogin */
  clientPortal: "/client/login",
} as const;

export const NAV_ABOUT = [
  { label: "About Us", href: ROUTES.about },
  { label: "Our Groomers", href: ROUTES.ourGroomers },
  { label: "Our Vans", href: ROUTES.ourVans },
  { label: "Reviews", href: ROUTES.reviews },
  { label: "Careers", href: ROUTES.careers },
  { label: "Locations", href: ROUTES.locations },
];

export const NAV_SERVICES = [
  { label: "All Grooming Services", href: ROUTES.services },
  { label: "Mobile Pet Spa & Salon", href: ROUTES.mobileSpa },
  { label: "Bathing & Washing", href: ROUTES.bathing },
  { label: "Nail Trimming", href: ROUTES.nails },
  { label: "Deshedding", href: ROUTES.deshedding },
];

export const NAV_COMPANY = [
  { label: "How It Works", href: ROUTES.howItWorks },
  { label: "Why Mobile Dog Salon", href: ROUTES.why },
  { label: "Blog", href: ROUTES.blog },
  { label: "Franchise", href: ROUTES.franchise },
  { label: "Contact", href: ROUTES.contact },
  { label: "Book Online", href: ROUTES.book },
  { label: "Staff Login", href: ROUTES.groomerLogin },
];

export const ALL_SERVICES = [
  {
    title: "Mobile Spa & Grooming",
    description: "Salon-quality care at your curb.",
    href: ROUTES.mobileSpa,
    image: IMAGE_SLOTS.serviceSpa,
    imagePosition: "52% 22%",
  },
  {
    title: "Nail Trimming",
    description: "Quiet, careful, and never rushed.",
    href: ROUTES.nails,
    image: IMAGE_SLOTS.serviceNails,
    imagePosition: "48% 28%",
  },
  {
    title: "Bathing & Washing",
    description: "Warm, gentle, eco-friendly baths.",
    href: ROUTES.bathing,
    image: IMAGE_SLOTS.serviceBath,
    imagePosition: "50% 25%",
  },
  {
    title: "Deshedding",
    description: "Less shedding. Softer, healthier coats.",
    href: ROUTES.deshedding,
    image: IMAGE_SLOTS.serviceDeshed,
    imagePosition: "50% 28%",
  },
];
