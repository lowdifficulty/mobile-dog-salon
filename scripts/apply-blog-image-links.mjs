/**
 * Apply blog images from mobile_dog_salon_blog_image_links handoff (PICRYL themes)
 * and randomize publish dates across Hattie Pup's weekday timespan.
 *
 * Run: node scripts/apply-blog-image-links.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const LINKS_PATH = path.join(ROOT, "_blog-image-links", "mobile_dog_salon_blog_image_links.json");
const MANIFEST_PATH = path.join(ROOT, "data", "blog-manifest.json");
const OUT_DIR = path.join(ROOT, "public", "images", "blog", "posts");
const USER_AGENT = "MobileDogSalon/1.0 (https://mobiledog-salon.com; blog-images)";

const BREEDS = [
  "goldendoodle",
  "labradoodle",
  "poodle",
  "golden retriever",
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
  "cavalier",
  "australian shepherd",
  "border collie",
  "bernese mountain dog",
  "bernese",
  "great pyrenees",
  "dachshund",
];

const DOG_WORDS =
  /\b(dog|puppy|puppies|canine|retriever|poodle|husky|bulldog|chihuahua|spaniel|shepherd|dachshund|terrier|maltese|collie|doodle|beagle|hound)\b/i;
const BAD_WORDS =
  /\b(cat|kitten|horse|cow|sheep|pig|bird|parrot|lion|tiger|bear|wolf|fox|rabbit|mouse|rat|snake|fish|frog)\b/i;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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
    const day = d.getDay();
    if (day >= 1 && day <= 5) pool.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return shuffle(pool).slice(0, count);
}

function buildQueries(theme, rowId) {
  const queries = [theme];
  const lower = theme.toLowerCase();

  for (const breed of BREEDS) {
    if (lower.includes(breed)) {
      queries.push(`${breed} dog`);
      queries.push(`happy ${breed}`);
    }
  }

  const simplified = theme
    .replace(/\b(cute|grooming|salon|van|wash|bath|trimming|brushing|deshedding|coat|haircut|close up|professional)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (simplified && simplified !== theme) queries.push(simplified);

  if (lower.includes("puppy")) queries.push("puppy dog");
  if (lower.includes("senior")) queries.push("senior dog");
  if (lower.includes("small")) queries.push("small dog");
  if (lower.includes("large")) queries.push("large dog");
  if (lower.includes("nail") || lower.includes("paws")) queries.push("dog paws");
  if (lower.includes("mobile")) queries.push("dog car happy");

  queries.push(`happy dog ${rowId % 17}`);
  return [...new Set(queries.filter(Boolean))];
}

function scoreResult(item) {
  const title = (item.title || "").toLowerCase();
  let score = 0;
  if (DOG_WORDS.test(title)) score += 10;
  if (/happy|cute|smile|play|portrait/i.test(title)) score += 3;
  if (BAD_WORDS.test(title)) score -= 15;
  if (/man|woman|person|people|boy|girl|child/i.test(title) && !DOG_WORDS.test(title)) score -= 8;
  return score;
}

async function searchOpenverse(query, page) {
  const url = `https://api.openverse.engineering/v1/images/?q=${encodeURIComponent(query)}&page_size=20&page=${page}&format=json`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.results ?? [];
}

async function findImage(row, usedUrls) {
  const theme = row.recommended_image_theme;
  const queries = buildQueries(theme, row.row_id);

  for (const query of queries) {
    const page = 1 + (row.row_id % 5);
    const results = await searchOpenverse(query, page);
    await sleep(250);

    const ranked = results
      .filter((r) => r.url && /\.(jpg|jpeg|png|webp)/i.test(r.url))
      .map((r) => ({ ...r, score: scoreResult(r) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    for (const item of ranked) {
      if (!usedUrls.has(item.url)) {
        usedUrls.add(item.url);
        return item;
      }
    }

    for (const item of results) {
      if (item.url && !usedUrls.has(item.url) && DOG_WORDS.test(item.title || "")) {
        usedUrls.add(item.url);
        return item;
      }
    }
  }

  return null;
}

async function downloadAndProcess(url, outPath) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await sharp(buffer)
    .resize(1200, 630, { fit: "cover", position: "attention" })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outPath);
}

async function main() {
  if (!fs.existsSync(LINKS_PATH)) {
    console.error("Missing handoff file:", LINKS_PATH);
    process.exit(1);
  }

  const links = JSON.parse(fs.readFileSync(LINKS_PATH, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const linkByTitle = new Map(
    links.map((r) => [r.blog_post_title.toLowerCase().trim(), r])
  );

  const usedUrls = new Set();
  let ok = 0;
  let fail = 0;

  console.log("Fetching public-domain images via Openverse (PICRYL handoff themes)...\n");

  for (const post of manifest) {
    const key = post.primaryKeyword.toLowerCase().trim();
    const row = linkByTitle.get(key);
    if (!row) {
      console.warn(`No link row for: ${post.primaryKeyword}`);
      fail++;
      continue;
    }

    const outFile = path.join(OUT_DIR, `${post.slug}.jpg`);
    const publicPath = `/images/blog/posts/${post.slug}.jpg`;

    process.stdout.write(`[${row.row_id}/200] ${post.slug.slice(0, 48)}... `);

    try {
      const img = await findImage(row, usedUrls);
      if (!img) {
        console.log("SKIP");
        fail++;
        continue;
      }

      await downloadAndProcess(img.url, outFile);
      post.image = publicPath;
      post.imageAlt = row.suggested_alt_text;
      post.imageSourceLink = row.public_domain_image_source_link;
      console.log("OK");
      ok++;
      await sleep(150);
    } catch (err) {
      console.log(`ERR ${err.message}`);
      fail++;
    }
  }

  const dates = randomWeekdayDates(manifest.length, "2023-01-03", "2026-06-13");
  const shuffledPosts = shuffle(manifest);
  shuffledPosts.forEach((post, i) => {
    post.publishedAt = dates[i];
  });

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const linkCopy = path.join(ROOT, "data", "blog-image-links.json");
  fs.copyFileSync(LINKS_PATH, linkCopy);

  console.log(`\nImages: ${ok} OK, ${fail} failed/skipped`);
  console.log("Publish dates randomized across weekdays Jan 2023 – Jun 2026");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
