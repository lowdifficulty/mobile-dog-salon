/**
 * Import 200 blog posts from mobile-dog-salon-200-blog-pack.zip
 * Run: node scripts/import-blog-pack.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PACK = path.join(ROOT, "_blog-pack", "mobile_dog_salon_200_blogs");
const OUT_MD = path.join(ROOT, "content", "blog");
const OUT_MANIFEST = path.join(ROOT, "data", "blog-manifest.json");
const DOG_INDICES = [
  "01", "02", "03", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16",
];

const BREED_IMAGES = {
  goldendoodle: "/images/blog/goldendoodle.jpg",
  labradoodle: "/images/blog/labrador.jpg",
  poodle: "/images/blog/poodle.jpg",
  "golden retriever": "/images/blog/golden-retriever.jpg",
  labrador: "/images/blog/labrador.jpg",
  "german shepherd": "/images/blog/german-shepherd.jpg",
  husky: "/images/blog/husky.jpg",
  "french bulldog": "/images/blog/french-bulldog.jpg",
  bulldog: "/images/blog/bulldog.jpg",
  chihuahua: "/images/blog/chihuahua.jpg",
  "shih tzu": "/images/blog/shih-tzu.jpg",
  maltese: "/images/blog/maltese.jpg",
  yorkie: "/images/blog/yorkie.jpg",
  "yorkshire terrier": "/images/blog/yorkie.jpg",
  "cocker spaniel": "/images/blog/cocker-spaniel.jpg",
  "cavalier": "/images/blog/cavalier.jpg",
  "australian shepherd": "/images/blog/australian-shepherd.jpg",
  "border collie": "/images/blog/border-collie.jpg",
  "bernese": "/images/blog/bernese.jpg",
  "great pyrenees": "/images/blog/great-pyrenees.jpg",
  dachshund: "/images/blog/dachshund.jpg",
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function generateWeekdayDates(count) {
  const dates = [];
  const d = new Date("2023-01-03T10:00:00"); // first Tuesday 2023
  while (dates.length < count) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) {
      const hour = 9 + (dates.length % 8);
      const copy = new Date(d);
      copy.setHours(hour, 30, 0, 0);
      dates.push(copy.toISOString().slice(0, 10));
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function extractExcerpt(md) {
  const lines = md.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  const text = lines[0]?.replace(/\*\*/g, "").trim() ?? "";
  return text.length > 160 ? text.slice(0, 157) + "…" : text;
}

function pickImage(entry) {
  const title = entry.title.toLowerCase();
  for (const [breed, imgPath] of Object.entries(BREED_IMAGES)) {
    if (title.includes(breed)) {
      const local = path.join(ROOT, "public", imgPath.replace(/^\//, ""));
      if (fs.existsSync(local)) return imgPath;
    }
  }
  const idx = (entry.blog_number - 1) % DOG_INDICES.length;
  return `/images/dogs/dog-${DOG_INDICES[idx]}.jpg`;
}

function buildKeywordMap(manifest) {
  const map = new Map();
  for (const entry of manifest) {
    const kw = entry.source_input?.toLowerCase().trim();
    if (kw) map.set(kw, entry.slug);
    map.set(entry.slug.replace(/-/g, " "), entry.slug);
  }
  return map;
}

function addInterlinks(md, currentSlug, keywordMap) {
  const keywords = [...keywordMap.keys()]
    .filter((k) => keywordMap.get(k) !== currentSlug && k.length > 8)
    .sort((a, b) => b.length - a.length);

  let linked = new Set();
  for (const keyword of keywords) {
    if (linked.has(keyword)) continue;
    const slug = keywordMap.get(keyword);
    if (!slug || slug === currentSlug) continue;
    const escaped = escapeRegex(keyword);
    const regex = new RegExp(`(?<![\\[/])(${escaped})(?![^\\[]*\\])`, "i");
    if (regex.test(md) && !md.includes(`/blog/${slug}`)) {
      md = md.replace(regex, `[$1](/blog/${slug})`);
      linked.add(keyword);
    }
  }
  return md;
}

function fixMetaTitle(entry) {
  if (entry.meta_title && entry.meta_title.length >= 40 && !entry.meta_title.endsWith(" ")) {
    return entry.meta_title;
  }
  const t = entry.title;
  return t.length > 60 ? t.slice(0, 57) + "…" : t;
}

function main() {
  const manifestPath = path.join(PACK, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("Missing manifest at", manifestPath);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  fs.mkdirSync(OUT_MD, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true });

  const keywordMap = buildKeywordMap(manifest);
  const dates = generateWeekdayDates(manifest.length);
  const processed = [];

  for (const entry of manifest) {
    const srcPath = path.join(PACK, entry.markdown_file);
    if (!fs.existsSync(srcPath)) {
      console.warn("Missing:", entry.markdown_file);
      continue;
    }
    let md = fs.readFileSync(srcPath, "utf8");
    md = addInterlinks(md, entry.slug, keywordMap);

    const outFile = path.join(OUT_MD, `${entry.slug}.md`);
    fs.writeFileSync(outFile, md, "utf8");

    processed.push({
      blog_number: entry.blog_number,
      category: entry.category,
      slug: entry.slug,
      title: entry.title,
      excerpt: extractExcerpt(md),
      metaTitle: fixMetaTitle(entry),
      metaDescription: entry.meta_description?.trim() || extractExcerpt(md),
      primaryKeyword: entry.source_input,
      author: "Hattie Pup",
      publishedAt: dates[entry.blog_number - 1],
      image: pickImage(entry),
    });
  }

  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(processed, null, 2), "utf8");
  console.log(`Imported ${processed.length} blog posts to content/blog/`);
}

main();
