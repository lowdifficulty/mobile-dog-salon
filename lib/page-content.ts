import { ROUTES } from "./routes";

export const ORANGE_COUNTY_REGIONS = [
  {
    name: "North Orange County",
    description: "Anaheim, Fullerton, Brea, Yorba Linda, Placentia, and surrounding neighborhoods.",
    cities: ["Anaheim", "Brea", "Buena Park", "Fullerton", "La Habra", "La Palma", "Placentia", "Yorba Linda", "Villa Park"],
  },
  {
    name: "Central Orange County",
    description: "Irvine, Tustin, Orange, Santa Ana, and the heart of the county.",
    cities: ["Irvine", "Tustin", "Orange", "Santa Ana", "Garden Grove", "Fountain Valley", "Cypress", "Los Alamitos", "Stanton"],
  },
  {
    name: "Coastal Orange County",
    description: "Beach cities and harbor communities from Huntington to Newport.",
    cities: ["Huntington Beach", "Newport Beach", "Costa Mesa", "Seal Beach", "Westminster"],
  },
  {
    name: "South Orange County",
    description: "Laguna, Mission Viejo, Lake Forest, RSM, and south to San Clemente.",
    cities: [
      "Laguna Beach",
      "Laguna Hills",
      "Laguna Niguel",
      "Laguna Woods",
      "Aliso Viejo",
      "Lake Forest",
      "Mission Viejo",
      "Rancho Santa Margarita",
      "Dana Point",
      "San Clemente",
      "San Juan Capistrano",
    ],
  },
];

export const ALL_ORANGE_COUNTY_CITIES = ORANGE_COUNTY_REGIONS.flatMap((r) => r.cities);

export const WHY_CHOOSE_US = [
  {
    title: "One-on-One, Cage-Free",
    description: "Your pet is our only client during their session — no waiting rooms, no other dogs, no stress.",
  },
  {
    title: "We Come to You",
    description: "Fast, affordable grooming right at your driveway. Skip the car ride and the salon chaos.",
  },
  {
    title: "Professional Pawfessionals",
    description: "Experienced groomers who build real relationships with your pet — visits feel like play dates.",
  },
  {
    title: "State-of-the-Art Mobile Spas",
    description: "Fully equipped vans with warm filtered water, quiet dryers, and eco-friendly products.",
  },
  {
    title: "Good Dogs Take Baths",
    description: "We believe every pup deserves a spa day — cute, calm, and seriously good grooming.",
  },
];

export const ABOUT_TIMELINE = [
  { year: "Today", title: "Orange County's Mobile Spa", description: "Serving pet families across all of Orange County with mobile grooming that comes to your curb." },
  { year: "Our Promise", title: "Pet Driven", description: "Every appointment is built around your pet's comfort, safety, and that fresh-out-of-the-spa feeling." },
];

export const GROOMER_PHILOSOPHY = [
  "Patience first — especially with nervous, senior, or rescue pets",
  "Salon-quality skills without the salon environment",
  "Clear communication with pet parents before, during, and after every visit",
  "Breed-specific styling and coat care expertise",
  "A calm, unrushed pace so no pet feels hurried",
];

export const GROOMER_SPECIALTIES = [
  { title: "Anxious & Rescue Pets", description: "One-on-one mobile grooming is ideal for dogs who struggle in traditional salons." },
  { title: "Senior Pets", description: "Gentle handling, shorter sessions when needed, and extra comfort at every step." },
  { title: "Multi-Pet Homes", description: "We can groom multiple pets in one visit — less hassle for busy families." },
  { title: "All Sizes & Breeds", description: "From tiny Chihuahuas to big Labs — every good dog gets our full attention." },
];

export const VAN_FEATURES = [
  { title: "Warm Filtered Water", description: "Hydro-jet baths with comfortable, filtered water for a thorough clean." },
  { title: "Hydraulic Grooming Tables", description: "Easy, safe positioning for pets of every size." },
  { title: "Quiet Professional Dryers", description: "Less noise and stress than salon blowers." },
  { title: "Eco-Friendly Products", description: "All-natural shampoos, conditioners, and gentle face wash." },
  { title: "Self-Contained Units", description: "Everything we need is on board — we work right at your curb." },
  { title: "Sanitized Between Visits", description: "Every van is cleaned and sanitized between appointments." },
];

export const SERVICE_PACKAGES = [
  {
    name: "Signature Spa Package",
    price: "From $120",
    description: "Our most popular full-service groom — bath, blow dry, brush out, ears, nails, and more.",
    features: ["Warm filtered bath", "All-natural shampoo & conditioner", "Hand blow dry", "Gentle brush out", "Ear cleaning", "Nail trim & file", "Teeth brushing"],
    href: ROUTES.mobileSpa,
  },
  {
    name: "Bath & Brush",
    price: "From $90",
    description: "Perfect for regular maintenance between full grooms.",
    features: ["Warm bath", "Blow dry", "Brush out", "Ear cleaning", "Nail trim available"],
    href: ROUTES.bathing,
  },
  {
    name: "Full Groom with Haircut",
    price: "From $150",
    description: "Complete groom with breed-specific or custom haircut styling.",
    features: ["Everything in Signature", "Breed-specific haircut", "Sanitary trim", "Paw pad trim"],
    href: ROUTES.mobileSpa,
  },
  {
    name: "Nail Trim Only",
    price: "From $35",
    description: "Quick, calm nail care at your curb.",
    features: ["Nail trim & file", "Paw pad check", "One-on-one session"],
    href: ROUTES.nails,
  },
];

export const ALWAYS_INCLUDED = [
  "One-on-one attention — no cages, ever",
  "Warm filtered hydro-jet water bath",
  "All-natural shampoos and conditioners",
  "Hand blow dry and gentle brush out",
  "Ear cleaning and nail trimming",
  "Professional, compassionate groomer",
  "Mobile convenience at your driveway",
];

export const JOB_OPENINGS = [
  {
    id: "fleet-service-rep",
    title: "Fleet Service Representative",
    type: "Full-Time",
    count: 1,
    pay: "Competitive hourly + benefits (details discussed in interview)",
    summary: "Keep our mobile spa fleet running smoothly across Orange County. You'll be the hero behind the bubbles — maintaining vans, coordinating service schedules, and ensuring every vehicle is ready for the next good dog's bath day.",
    responsibilities: [
      "Perform routine maintenance and cleaning on mobile grooming vans",
      "Coordinate vehicle readiness with groomers and scheduling",
      "Track supplies, equipment, and van inventory",
      "Assist with light repairs and vendor coordination as needed",
      "Maintain safety and sanitation standards across the fleet",
    ],
    requirements: [
      "Valid driver's license and clean driving record",
      "Experience with vehicle maintenance or fleet operations a plus",
      "Organized, reliable, and comfortable working independently",
      "Love for animals and a positive, can-do attitude",
    ],
  },
  {
    id: "groomer-part-time",
    title: "Part-Time Dog Groomer",
    type: "Part-Time",
    count: 2,
    pay: "$30/hour commission",
    summary: "We're hiring two part-time groomers to join our Orange County mobile spa team. If you're skilled, patient, and love making dogs look and feel amazing — we want to meet you.",
    responsibilities: [
      "Provide one-on-one mobile grooming in our fully equipped vans",
      "Communicate clearly and warmly with pet parents",
      "Maintain a calm, cage-free experience for every pet",
      "Follow breed-specific styling and coat care best practices",
      "Keep van workspace clean and organized during and after sessions",
    ],
    requirements: [
      "Professional dog grooming experience required",
      "Valid driver's license — you'll drive the mobile spa to clients",
      "Gentle handling skills with anxious, senior, or large breeds",
      "Strong communication and reliability",
      "Passion for pets and the Mobile Dog Salon brand",
    ],
  },
];

export const CAREER_PERKS = [
  "Flexible scheduling for part-time groomers",
  "One-on-one grooming — no chaotic salon floor",
  "Growing client base across Orange County",
  "Supportive, pet-loving team culture",
  "Commission structure with transparent earnings ($30/hr for groomers)",
  "Work with a brand people actually love — Good Dogs Take Baths!",
];

export const CAREER_FAQS = [
  {
    question: "What positions are you hiring for right now?",
    answer: "We're hiring one Fleet Service Representative and two Part-Time Dog Groomers at $30/hour commission.",
  },
  {
    question: "Do groomers need their own vehicle?",
    answer: "No — you'll use our fully equipped mobile spa vans. A valid driver's license is required.",
  },
  {
    question: "What areas will I work in?",
    answer: "Groomers and fleet staff support routes throughout Orange County, California.",
  },
  {
    question: "How do I apply?",
    answer: "Email careers@mobiledog-salon.com with your resume, the role you're interested in, and a short note about why you'd be a great fit.",
  },
];

export const SERVICE_CONTENT = {
  mobileSpa: {
    intro: "Our mobile pet spa brings the full salon experience to your driveway. Every session is one-on-one with a professional groomer — no cages, no barking rooms, no stressful drop-offs. Just calm, cage-free care and a pup who looks (and smells) incredible.",
    why: [
      "Breed-specific haircuts and styling",
      "Ideal for anxious, senior, and rescue pets",
      "All-natural, gentle products",
      "One groomer, one pet, entire session",
    ],
    included: [
      "Warm filtered hydro-jet bath",
      "Premium shampoo & conditioner",
      "Hand blow dry",
      "Full brush out",
      "Ear cleaning",
      "Nail trim & file",
      "Teeth brushing",
      "Breed-specific haircut (full groom packages)",
    ],
    idealFor: ["Full grooms & haircuts", "Regular spa maintenance", "Dogs who hate the salon", "Pampered pups who deserve the works"],
    faqs: [
      { question: "What is included in a full spa groom?", answer: "Bath, blow dry, brush out, ear cleaning, nail trim, and breed-specific haircut as requested. Teeth brushing is included in our Signature packages." },
      { question: "Do you groom cats?", answer: "Yes — we offer gentle mobile grooming for cats as well as dogs. Let us know when booking." },
      { question: "How long does a session take?", answer: "Most full grooms run 60–90 minutes depending on size, coat condition, and temperament." },
      { question: "How much does a full groom cost?", answer: "Pricing typically ranges from $120–$350+ based on size, breed, and coat. Book online or call for your pup's exact quote." },
    ],
  },
  bathing: {
    intro: "Sometimes your dog just needs a good bath — warm water, quality products, and a professional finish without the full haircut. Our bathing service uses filtered water and gentle, eco-friendly shampoos right at your curb.",
    why: [
      "Great between full grooms",
      "Less shedding with proper blow dry & brush",
      "Gentle on sensitive skin",
      "No salon wait times",
    ],
    included: [
      "Pre-bath brush out",
      "Warm filtered bath",
      "All-natural shampoo & conditioner",
      "Hand blow dry",
      "Brush out",
      "Ear cleaning",
      "Nail trim available as add-on",
    ],
    idealFor: ["Regular coat maintenance", "Dirty pups after beach days", "Light shedding control", "Puppies not ready for full grooms"],
    faqs: [
      { question: "What shampoo do you use?", answer: "We use all-natural, pet-safe shampoos and conditioners suited to your dog's coat and skin." },
      { question: "Can I stay nearby during the bath?", answer: "Absolutely — many pet parents prefer to be close while their pet is being bathed." },
      { question: "Do you offer hypoallergenic products?", answer: "Yes — tell us about sensitivities when booking and we'll use appropriate products." },
    ],
  },
  nails: {
    intro: "Nail trims shouldn't be stressful. In our quiet, one-on-one mobile environment, we take the time your pet needs — trim, file, and paw pad check included.",
    why: [
      "Quiet, calm environment",
      "No rushing sensitive paws",
      "Trim and smooth finish",
      "Standalone or add-on service",
    ],
    included: [
      "Nail trimming",
      "Nail filing / smoothing",
      "Paw pad inspection",
      "Calm, unrushed one-on-one session",
    ],
    idealFor: ["Dogs anxious about nail trims", "Senior pets", "Quick curb-side appointments", "Add-on to bath or full groom"],
    faqs: [
      { question: "How often should nails be trimmed?", answer: "Most dogs need trims every 3–4 weeks. We'll advise based on your pet's growth and activity." },
      { question: "Do you grind nails?", answer: "Yes — we trim and file for a smooth, comfortable finish." },
      { question: "Can you groom anxious pets for nail trims only?", answer: "Yes — our mobile one-on-one setup is ideal for nervous dogs." },
    ],
  },
  deshedding: {
    intro: "Loose fur everywhere? Our deshedding treatment removes undercoat, reduces shedding, and leaves your dog's coat softer and healthier — all without a trip to the salon.",
    why: [
      "Reduces shedding at home",
      "Healthier skin & coat",
      "Great for double-coated breeds",
      "Gentle dematting when needed",
    ],
    included: [
      "Deep brush out",
      "Deshedding treatment",
      "Bath with deshedding shampoo",
      "Conditioning treatment",
      "Blow dry & finish",
    ],
    idealFor: ["Golden Retrievers, Labs, Shepherds", "Seasonal coat blow-outs", "Heavy shedders", "Long-coated breeds"],
    faqs: [
      { question: "How often should I deshed my dog?", answer: "Seasonal deshedding every 4–8 weeks helps manage heavy undercoat breeds." },
      { question: "Will deshedding stop all shedding?", answer: "It significantly reduces loose undercoat but won't eliminate natural shedding entirely." },
      { question: "Can you handle matted coats?", answer: "Yes — we offer gentle dematting. Severe matting may require a shorter cut for your pet's comfort." },
    ],
  },
};
