import { ALL_ORANGE_COUNTY_CITIES } from "./page-content";

export const BOOKING_URL = "https://tpmr.com/i/99105";

export const PHONE_NUMBER = "(714) 555-0123";
export const PHONE_HREF = "tel:+17145550123";
export const SMS_HREF = "sms:+17145550123";

export const ORANGE_COUNTY_CITIES = ALL_ORANGE_COUNTY_CITIES;

export const SIT_STAY_BENEFITS = [
  "Convenience",
  "Comfort",
  "Safety",
  "Fast & Easy",
  "Professional Groomers",
  "State-of-the-Art Vans",
];

export const PET_TYPES = [
  "Multiple Pets",
  "Anxious Pets",
  "Older Pets",
  "Large Pets",
  "Challenging Pets",
  "State-of-the-Art Vans",
];

export const HOW_IT_WORKS_STEPS = [
  {
    title: "Book Your Appointment",
    description:
      "A groomer will get in touch to set up the perfect time.",
  },
  {
    title: "Your Groomer Comes to You",
    description: "Right to your driveway.",
  },
  {
    title: "One-on-One Spa Session",
    description: "Calm, unrushed, cage-free.",
  },
  {
    title: "Your Pet Looks (and Feels) Amazing!",
    description: "Tail wags guaranteed.",
  },
];

export const REVIEWS = [
  {
    name: "Treva",
    quote:
      "So happy with the service. They take such good care of my boy Leo. Having the mobile service makes all the difference in the world. Thank you :)",
  },
  {
    name: "Siegel A.",
    quote:
      "Absolutely great service. Mobile Dog Salon was gentle, communicative and best of all convenient. I would definitely recommend their services!",
  },
  {
    name: "Michael E.",
    quote:
      "We switched to Mobile Dog Salon and are absolutely thrilled we did. My only regret is we didn't use them first. Super friendly folks!",
  },
  {
    name: "Lisa B.",
    quote:
      "My dog is so shy, but this company rains love and companionship all over — she actually looks forward to her next visits, so thank you!!",
  },
];

export { BLOG_POSTS } from "./blog-public";

export const FAQS = [
  {
    question: "What makes Mobile Dog Salon special?",
    answer:
      "We believe grooming should be about health, wellness, peace of mind, and convenience for both you and your furry best friend. Our service is one-on-one the entire time — no cages, no other dogs, no salon stress.",
  },
  {
    question: "How much does Mobile Dog Salon cost?",
    answer:
      "Price varies based on your dog's size, breed, coat condition, and the service you select. Services typically range from $120–$350+. Book online or call us for your pup's exact cost.",
  },
  {
    question: "Does Mobile Dog Salon service my area?",
    answer:
      "We proudly serve all of Orange County — from Huntington Beach to Yorba Linda, Irvine, Laguna Beach, and everywhere in between.",
  },
];

export const PET_SIZES = [
  { value: "small", title: "Small Dog", weight: "1-30 lbs", label: "Small Dog (1-30 lbs)" },
  { value: "medium", title: "Medium Dog", weight: "30-50 lbs", label: "Medium Dog (30-50 lbs)" },
  { value: "large", title: "Large Dog", weight: "50+ lbs", label: "Large Dog (50+ lbs)" },
];

/** @deprecated Use GROOMING_SERVICES from lib/pricing.ts for booking */
export const SERVICE_OPTIONS = [
  { value: "full-groom", label: "Full Groom and Haircut", price: "From $110" },
  { value: "bath-brush", label: "Bath & Brush", price: "From $90" },
];
