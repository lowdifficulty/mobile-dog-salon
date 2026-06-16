/**
 * Assign blog preview/post images randomly from Google Drive dog photos.
 * Also randomizes publish dates across Hattie Pup's weekday timespan.
 *
 * Run: node scripts/randomize-blog-drive-images.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "data", "blog-manifest.json");

/** Same pool as lib/images.ts — IMG_6951 (dog-04) excluded */
const DRIVE_DOG_PHOTOS = [
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
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomWeekdayDates(count, startStr, endStr) {
  const pool = [];
  const d = new Date(startStr);
  const end = new Date(endStr);
  while (d <= end) {
    if (d.getDay() >= 1 && d.getDay() <= 5) {
      pool.push(d.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return shuffle(pool).slice(0, count);
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const dates = randomWeekdayDates(manifest.length, "2023-01-03", "2026-06-13");
  const posts = shuffle(manifest);

  posts.forEach((post, i) => {
    const img =
      DRIVE_DOG_PHOTOS[Math.floor(Math.random() * DRIVE_DOG_PHOTOS.length)];
    post.image = img;
    post.imageAlt = `Groomed dog at Mobile Dog Salon — ${post.title}`;
    post.publishedAt = dates[i];
    delete post.imageSourceLink;
  });

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const uniqueImages = new Set(manifest.map((p) => p.image)).size;
  const uniqueDates = new Set(manifest.map((p) => p.publishedAt)).size;
  console.log(`Updated ${manifest.length} posts`);
  console.log(`Images: ${uniqueImages} unique from ${DRIVE_DOG_PHOTOS.length} Drive photos`);
  console.log(`Dates: ${uniqueDates} unique weekdays (2023–2026), order randomized`);
}

main();
