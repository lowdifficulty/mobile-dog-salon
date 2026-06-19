/** Real groomed-dog photos from Mobile Dog Salon (Google Drive). */
export const BRANDING_AD = "/images/branding-ad.png";

/** 1200×1200 — square link preview for Instagram, Facebook, iMessage */
export const OG_SHARE_IMAGE = "/images/og-home-square.jpg";

/** @deprecated Use OG_SHARE_IMAGE — kept for reference */
export const OG_HOME_IMAGE = "/images/og-home.jpg";

/** IMG_6951 (dog-04) removed — stressed dog, not used on site. */
export const DOG_PHOTOS = [
  "/images/dogs/dog-01.jpg",
  "/images/dogs/dog-02.jpg",
  "/images/dogs/dog-03.jpg",
  "/images/dogs/dog-05.jpg",
  "/images/dogs/dog-06.jpg",
  "/images/dogs/dog-07.jpg",
  "/images/dogs/dog-08.jpg",
  "/images/dogs/dog-09.jpg",
  "/images/dogs/dog-10.jpg",
  "/images/dogs/dog-11.jpg",
  "/images/dogs/dog-12.jpg",
  "/images/dogs/dog-13.jpg",
  "/images/dogs/dog-14.jpg",
  "/images/dogs/dog-15.jpg",
  "/images/dogs/dog-16.jpg",
] as const;

export const TAGLINE = "Good Dogs Take Baths";

export function dogPhoto(index: number): string {
  return DOG_PHOTOS[index % DOG_PHOTOS.length];
}

export const IMAGE_SLOTS = {
  hero: BRANDING_AD,
  sitStay: dogPhoto(1),
  lovedByPets: dogPhoto(2),
  groomers: "/images/dogs/dog-groomers.jpg",
  vans: dogPhoto(3),
  serviceSpa: dogPhoto(4),
  serviceNails: dogPhoto(5),
  serviceBath: dogPhoto(6),
  serviceDeshed: dogPhoto(7),
  about: dogPhoto(8),
  blog1: dogPhoto(9),
  blog2: dogPhoto(10),
  blog3: dogPhoto(11),
  reviews: dogPhoto(12),
  careers: dogPhoto(13),
  locations: dogPhoto(14),
} as const;
