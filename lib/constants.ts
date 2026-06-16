export const BOOKING_URL = "https://tpmr.com/i/99105";

export const PHONE_NUMBER = "(714) 555-0123";
export const PHONE_HREF = "tel:+17145550123";
export const SMS_HREF = "sms:+17145550123";

export const ORANGE_COUNTY_CITIES = [
  "Anaheim",
  "Brea",
  "Costa Mesa",
  "Dana Point",
  "Fountain Valley",
  "Fullerton",
  "Garden Grove",
  "Huntington Beach",
  "Irvine",
  "Laguna Beach",
  "Laguna Hills",
  "Laguna Niguel",
  "Lake Forest",
  "Mission Viejo",
  "Newport Beach",
  "Orange",
  "Rancho Santa Margarita",
  "San Clemente",
  "Santa Ana",
  "Tustin",
  "Westminster",
  "Yorba Linda",
];

export const SERVICES = [
  { icon: "bath", title: "Warm Water Bath" },
  { icon: "products", title: "All-Natural Products" },
  { icon: "brush", title: "Gentle Brushing & Blowdry" },
  { icon: "teeth", title: "Teeth Cleaning & Ear Cleaning" },
  { icon: "haircut", title: "Breed-Specific Haircut" },
  { icon: "nails", title: "Nail Trimming & Filing" },
];

export const REVIEWS = [
  {
    name: "Emily C.",
    headline: "Rosie's coat feels silky smooth and soft - thanks again!",
    text: "Rosie's coat feels silky smooth and soft - thanks again!",
    rating: 5,
  },
  {
    name: "Mark D.",
    headline: "Toby looks absolutely perfect - thank you!",
    text: "Toby looks absolutely perfect - thank you!",
    rating: 5,
  },
  {
    name: "Anthony G.",
    headline: "Handled with care and looks cuter than ever!",
    text: "Handled with care and looks cuter than ever!",
    rating: 5,
  },
];

export const PRESS_LOGOS = ["Google", "Yelp", "Forbes", "People", "Sunset", "CBS"];

export const FAQS = [
  {
    question: "What makes Mobile Dog Salon special?",
    answer:
      "We believe grooming should be about health, wellness, peace of mind, and convenience for both you and your furry best friend. Our service is one-on-one the entire time — no cages, no other dogs, no salon stress. Our mobile grooming vans are fully self-sufficient and engineered for stress-free grooming right at your doorstep.",
  },
  {
    question: "What is included in the Signature Service?",
    answer:
      "Our Signature Service includes: warm filtered hydro-jet water bath, all-natural shampoos, conditioners and face wash, hand blow dry, gentle brush out, ear cleaning, nail trimming and filing, teeth brushing, and anal gland expression if needed. Full body and partial haircuts are available as add-on services.",
  },
  {
    question: "How much does Mobile Dog Salon cost?",
    answer:
      "We are competitively priced with top-rated dog grooming services. Price varies based on your dog's size, breed, coat condition, and the service you select. Services typically range from $120–$350+. Book online or call us for your pup's exact cost and any current promotions.",
  },
  {
    question: "How do I schedule an appointment?",
    answer:
      "You can book the date and time that works best for you directly from your phone or web browser. Prefer talking on the phone? Our team is here to help with anything you need — booking, pup health tips, or service questions.",
  },
  {
    question: "Does Mobile Dog Salon service my area?",
    answer:
      "We proudly serve all of Orange County — from Huntington Beach to Yorba Linda, Irvine, Laguna Beach, Dana Point, San Clemente, Newport Beach, and everywhere in between. Don't see your neighborhood listed? Drop us a line — we're always expanding our service routes!",
  },
];

export const LOCATION_REGIONS = [
  {
    name: "California",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
    areas: ["Orange County"],
    cities: ORANGE_COUNTY_CITIES.slice(0, 10),
  },
];

export const PET_SIZES = [
  { value: "small", label: "Small (under 25 lbs)" },
  { value: "medium", label: "Medium (25–50 lbs)" },
  { value: "large", label: "Large (50–80 lbs)" },
  { value: "xlarge", label: "Extra Large (80+ lbs)" },
];

export const SERVICE_OPTIONS = [
  { value: "signature", label: "Signature Service", price: "From $120" },
  { value: "bath-brush", label: "Bath & Brush", price: "From $90" },
  { value: "full-groom", label: "Full Groom with Haircut", price: "From $150" },
  { value: "nail-only", label: "Nail Trim Only", price: "From $35" },
  { value: "teeth-only", label: "Teeth Brushing Only", price: "From $25" },
];
