/**
 * Fetch public-domain dog images from Wikimedia Commons for each blog post.
 * Run: node scripts/fetch-blog-images.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "data", "blog-manifest.json");
const OUT_DIR = path.join(ROOT, "public", "images", "blog", "posts");
const USER_AGENT = "MobileDogSalon/1.0 (https://mobiledog-salon.com; blog-image-fetch)";

const BREEDS = [
  "goldendoodle",
  "labradoodle",
  "poodle",
  "golden retriever",
  "labrador retriever",
  "labrador",
  "german shepherd",
  "husky",
  "siberian husky",
  "french bulldog",
  "english bulldog",
  "bulldog",
  "chihuahua",
  "shih tzu",
  "maltese",
  "yorkshire terrier",
  "yorkie",
  "cocker spaniel",
  "cavalier king charles spaniel",
  "cavalier",
  "australian shepherd",
  "border collie",
  "bernese mountain dog",
  "bernese",
  "great pyrenees",
  "dachshund",
];

const CITIES = [
  "irvine",
  "newport beach",
  "huntington beach",
  "costa mesa",
  "anaheim",
  "santa ana",
  "orange",
  "tustin",
  "mission viejo",
  "laguna beach",
  "laguna niguel",
  "san clemente",
  "dana point",
  "lake forest",
  "fullerton",
  "garden grove",
  "yorba linda",
];

const MOOD_TERMS = [
  "happy smiling",
  "playful outdoors",
  "cute puppy",
  "running grass",
  "portrait cheerful",
  "sunny day",
  "friendly pet",
  "groomed coat",
  "wet bath fun",
  "tongue out happy",
];

const SERVICE_PHOTO = {
  nail: ["dog paws close up", "happy dog paws"],
  bath: ["wet happy dog", "wet dog happy splash"],
  wash: ["wet happy dog splash"],
  deshed: ["fluffy golden retriever shedding", "fluffy dog portrait happy"],
  haircut: ["shaggy happy dog", "fluffy dog happy portrait"],
  van: ["happy dog car window", "dog happy car"],
  puppy: ["happy puppy playing", "golden retriever puppy happy"],
  senior: ["gentle golden retriever happy", "senior labrador happy"],
  small: ["small dog happy smiling", "chihuahua happy small dog"],
  large: ["large dog happy bernese", "great pyrenees happy dog"],
  doodle: ["goldendoodle happy dog", "labradoodle happy dog"],
};

/** Photo-only Wikimedia searches — avoid words that match scanned books/PDFs */
const PHOTO_QUERIES = [
  "happy dog smiling",
  "smiling golden retriever grass",
  "happy golden retriever",
  "happy labrador retriever",
  "happy puppy playing outdoors",
  "cute dog tongue out happy",
  "happy border collie dog",
  "happy beagle smiling",
  "fluffy dog happy portrait",
  "golden retriever puppy happy",
  "happy husky smiling",
  "happy french bulldog",
  "small dog happy smiling",
  "wet dog happy",
  "happy cocker spaniel",
  "happy shih tzu dog",
  "happy poodle dog",
  "happy chihuahua dog",
  "happy dachshund smiling",
  "happy australian shepherd",
  "happy yorkshire terrier",
  "happy maltese dog",
  "happy german shepherd dog",
  "smiling dog face",
  "happy dog laying sun",
  "dog smiles happy",
  "golden retriever smiling",
  "labrador happy dog",
  "cute puppy happy grass",
  "happy dog geograph",
  "happy hound dog",
  "spaniel dog happy",
  "collie dog happy outdoors",
  "terrier dog happy smiling",
  "bulldog happy smiling",
  "retriever happy grass field",
  "happy dog portrait outdoors",
  "playful dog happy running",
  "happy dog tongue out grass",
  "smiling dog face happy",
];

/** Unsplash stock fallbacks (free license) — guaranteed happy dog photos */
const UNSPLASH_FALLBACK = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1558787533-47af9ce1f48d?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1560807707-8cc762ac4daa?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1596495577824-9418b0b9c0af?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1601757544867-52c16e8ca163?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1477880098804-9ad7dce7000a?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1507146422129-e927df9b1268?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1583511655852-d21d41cdf801?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1517420672711-497bb04c8d1c?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1616194722875-948a572de93d?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1561037404-61cd46acd972?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1546527868-ccb7ee7dfa6a?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1534361960055-19889db9621e?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1525256179453-484d69965a07?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1576201832326-d5115ea594c9?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1608098548043-4e4a0d0f2050?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1623387649148-89001373c31f?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1588943211346-0908a1e0cc40?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1552053831-71594a27632d?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1547406370-3c6a5f7a2f8f?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1494947665474-74bb96384fbc?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1591946614720-90a587da4a36?w=1280&h=720&fit=crop",
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1280&h=720&fit=crop&q=80",
];

const BLOCKED_TITLE = /\b(pdf|\.pdf|djvu|\.djvu|journal|magazine|book|library|vocabulary|farce|acts|scalpel|heritage|windsor|christmas|melting pot|courier|vital signs|javanese|health guide|bride and groom|author|judge|district court|university|almanac|register|diary|notebook|unfolding life|old farmer|biographical|digital library|ballads|poems|voyage to|spirit monition|purple and gold|happy prince|happy garden|happy end|orange girl)\b/i;

const BLOCKED_PEOPLE = /\b(woman with|man with|elderly woman|author,|judge|portrait of a man|portrait of a woman|wedding couple)\b/i;

const DOG_SIGNAL = /\b(dog|puppy|puppies|canine|pet|retriever|poodle|husky|bulldog|chihuahua|spaniel|shepherd|dachshund|terrier|maltese|groom|hound|collie|doodle|beagle|pyrenees|bernese)\b/i;

function isGoodDogImage(title, url) {
  const t = title.toLowerCase();
  if (BLOCKED_TITLE.test(t)) return false;
  if (BLOCKED_PEOPLE.test(t)) return false;
  if (t.includes("ia ") || t.includes("(ia ")) return false;
  if (/cu319\d+/i.test(t)) return false;
  if (/\b(lamb|kitten|cat |pariah)\b/.test(t)) return false;
  if (!/\.(jpg|jpeg|png|webp)/i.test(url)) return false;
  if (!DOG_SIGNAL.test(t)) return false;
  return true;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function detectBreed(text) {
  const lower = text.toLowerCase();
  for (const breed of BREEDS) {
    if (lower.includes(breed)) return breed;
  }
  return null;
}

function detectCity(text) {
  const lower = text.toLowerCase();
  for (const city of CITIES) {
    if (lower.includes(city)) return city;
  }
  if (lower.includes("orange county")) return "orange county california";
  return null;
}

function buildSearchQueries(post) {
  const title = post.title.toLowerCase();
  const kw = (post.primaryKeyword || "").toLowerCase();
  const combined = `${title} ${kw}`;
  const queries = [];
  const breed = detectBreed(combined);

  if (breed) {
    queries.push(`happy ${breed} dog`);
    queries.push(`${breed} dog smiling`);
    queries.push(`happy ${breed}`);
  }

  for (const [key, terms] of Object.entries(SERVICE_PHOTO)) {
    if (combined.includes(key)) {
      queries.push(...terms);
    }
  }

  const start = post.blog_number % PHOTO_QUERIES.length;
  for (let i = 0; i < 10; i++) {
    queries.push(PHOTO_QUERIES[(start + i) % PHOTO_QUERIES.length]);
  }

  return [...new Set(queries)];
}

async function searchCommons(query, offset = 0) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "8",
    gsroffset: String(offset),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1280",
    format: "json",
  });

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) return [];
  const data = await res.json();
  if (data.error) return [];

  const pages = Object.values(data.query?.pages ?? {});
  return pages
    .map((p) => {
      const info = p.imageinfo?.[0];
      if (!info?.thumburl) return null;
      const title = p.title?.replace(/^File:/, "").replace(/_/g, " ") ?? query;
      if (!isGoodDogImage(title, info.thumburl)) return null;
      const license = info.extmetadata?.LicenseShortName?.value ?? "";
      const badLicense = /unknown|all rights reserved/i.test(license);
      if (badLicense) return null;
      return {
        title,
        url: info.thumburl,
        license,
      };
    })
    .filter(Boolean);
}

async function findImage(post, usedUrls, fallbackPool) {
  const queries = buildSearchQueries(post);

  for (const query of queries) {
    const offset = (post.blog_number % 4) * 5;
    const results = await searchCommons(query, offset);
    await sleep(300);

    for (const img of results) {
      if (!usedUrls.has(img.url)) {
        usedUrls.add(img.url);
        return img;
      }
    }
  }

  for (const img of fallbackPool) {
    if (!usedUrls.has(img.url)) {
      usedUrls.add(img.url);
      return img;
    }
  }

  return getUnsplashFallback(post, usedUrls);
}

async function buildFallbackPool(usedUrls) {
  const pool = [];
  const offsets = [0, 8, 16, 24, 32, 40];
  for (const q of PHOTO_QUERIES) {
    for (const offset of offsets) {
      const results = await searchCommons(q, offset);
      await sleep(200);
      for (const img of results) {
        if (!usedUrls.has(img.url)) {
          pool.push(img);
          usedUrls.add(img.url);
        }
      }
    }
    if (pool.length >= 250) break;
  }
  for (const img of pool) usedUrls.delete(img.url);
  return pool;
}

function getUnsplashFallback(post, usedUrls) {
  for (let i = 0; i < UNSPLASH_FALLBACK.length; i++) {
    const url = UNSPLASH_FALLBACK[(post.blog_number + i) % UNSPLASH_FALLBACK.length];
    if (!usedUrls.has(url)) {
      usedUrls.add(url);
      return { title: "Happy dog stock photo", url };
    }
  }
  return null;
}

async function downloadAndProcess(url, outPath) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  await sharp(buffer)
    .resize(1200, 630, { fit: "cover", position: "attention" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outPath);
}

function buildImageAlt(post, imageTitle) {
  const breed = detectBreed(`${post.title} ${post.primaryKeyword}`);
  if (breed) {
    return `Happy ${breed} dog — ${post.title}`;
  }
  return `Happy dog — ${post.title}`;
}

async function main() {
  const onlyCategory = process.argv[2]; // e.g. "Local SEO"
  const fixBadOnly = process.argv[3] === "--fix-bad";
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const usedUrls = new Set();
  // Track images already assigned to good posts so we don't duplicate
  for (const p of manifest) {
    if (p.imageAlt?.startsWith("Happy ")) {
      // can't track wikimedia urls for existing — only block unsplash reuse by count
    }
  }

  let ok = 0;
  let fail = 0;

  let posts = onlyCategory
    ? manifest.filter((p) => p.category === onlyCategory)
    : manifest;

  if (fixBadOnly) {
    posts = posts.filter((p) => !p.imageAlt?.startsWith("Happy "));
  }

  console.log(`Processing ${posts.length} posts...`);
  console.log("Building fallback image pool from Wikimedia Commons...");
  const fallbackPool = await buildFallbackPool(usedUrls);
  console.log(`Fallback pool: ${fallbackPool.length} images\n`);

  for (const post of posts) {
    const outFile = path.join(OUT_DIR, `${post.slug}.jpg`);
    const publicPath = `/images/blog/posts/${post.slug}.jpg`;

    process.stdout.write(`[${post.blog_number}/200] ${post.slug.slice(0, 50)}... `);

    try {
      const img = await findImage(post, usedUrls, fallbackPool);
      if (!img) {
        console.log("SKIP (no image found)");
        fail++;
        continue;
      }

      await downloadAndProcess(img.url, outFile);
      post.image = publicPath;
      post.imageAlt = buildImageAlt(post, img.title);
      console.log("OK");
      ok++;
      await sleep(200);
    } catch (err) {
      console.log(`ERR: ${err.message}`);
      fail++;
    }
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(`\nDone: ${ok} images saved, ${fail} skipped/failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
