import { IMAGE_SLOTS } from "@/lib/images";

export const ROUTES = {
  home: "/",
  book: "/book",
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
  contact: "/contact",
  privacy: "/privacy-policy",
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
  { label: "Contact", href: ROUTES.contact },
  { label: "Book Online", href: ROUTES.book },
];

export const ALL_SERVICES = [
  {
    title: "Mobile Spa & Grooming",
    description: "Salon-quality care at your curb.",
    href: ROUTES.mobileSpa,
    image: IMAGE_SLOTS.serviceSpa,
  },
  {
    title: "Nail Trimming",
    description: "Quiet, careful, and never rushed.",
    href: ROUTES.nails,
    image: IMAGE_SLOTS.serviceNails,
  },
  {
    title: "Bathing & Washing",
    description: "Warm, gentle, eco-friendly baths.",
    href: ROUTES.bathing,
    image: IMAGE_SLOTS.serviceBath,
  },
  {
    title: "Deshedding",
    description: "Less shedding. Softer, healthier coats.",
    href: ROUTES.deshedding,
    image: IMAGE_SLOTS.serviceDeshed,
  },
];
