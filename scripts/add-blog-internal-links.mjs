/**
 * Ensure each blog markdown file has at least 2 in-body internal links.
 * Run: node scripts/add-blog-internal-links.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, "data", "blog-manifest.json");
const CONTENT_DIR = path.join(ROOT, "content", "blog");

function extractLocalSeoCluster(slug) {
  const patterns = [
    /^(?:mobile-)?dog-grooming-(.+?)-a-simple-guide/,
    /^dog-groomer-(.+?)-(?:ca-)?a-simple-guide/,
    /^mobile-pet-grooming-(.+?)-a-simple-guide/,
    /^pet-grooming-(.+?)-a-simple-guide/,
    /^dog-grooming-(.+?)-how-to-choose/,
    /^mobile-dog-grooming-(.+?)-how-to-choose/,
    /^pet-grooming-(.+?)-how-to-choose/,
  ];
  for (const pattern of patterns) {
    const match = slug.match(pattern);
    if (match) return match[1];
  }
  if (slug.includes("orange-county")) return "orange-county";
  if (slug.includes("near-me")) return "near-me";
  return null;
}

function breedGroupNumber(blogNumber) {
  return Math.floor((blogNumber - 101) / 5);
}

function getRelatedSlugs(manifest, slug, limit = 3) {
  const post = manifest.find((entry) => entry.slug === slug);
  if (!post) return [];

  return manifest
    .filter((candidate) => {
      if (candidate.slug === slug) return false;
      if (post.category === "Breed Grooming Tips" && candidate.category === "Breed Grooming Tips") {
        return breedGroupNumber(candidate.blog_number) === breedGroupNumber(post.blog_number);
      }
      if (post.category === "Local SEO" && candidate.category === "Local SEO") {
        const postCluster = extractLocalSeoCluster(post.slug);
        const candidateCluster = extractLocalSeoCluster(candidate.slug);
        if (postCluster && candidateCluster) return postCluster === candidateCluster;
        return Math.abs(candidate.blog_number - post.blog_number) <= 5;
      }
      return false;
    })
    .sort((a, b) => a.blog_number - b.blog_number)
    .slice(0, limit)
    .map((entry) => entry.slug);
}

function countBlogLinks(md) {
  return (md.match(/\]\(\/blog\//g) ?? []).length;
}

function ensureRelatedSection(md, relatedEntries) {
  const missing = relatedEntries.filter((entry) => !md.includes(`/blog/${entry.slug}`));
  if (missing.length === 0) return md;

  const sectionHeader = "## Related Articles";
  const lines = missing.map((entry) => `- [${entry.title}](/blog/${entry.slug})`);

  if (md.includes(sectionHeader)) {
    return md;
  }

  return `${md.trim()}\n\n${sectionHeader}\n\n${lines.join("\n")}\n`;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const manifestBySlug = new Map(manifest.map((entry) => [entry.slug, entry]));

let updated = 0;
let skipped = 0;

for (const entry of manifest) {
  const filePath = path.join(CONTENT_DIR, `${entry.slug}.md`);
  if (!fs.existsSync(filePath)) continue;

  let md = fs.readFileSync(filePath, "utf8");
  const before = md;
  const relatedSlugs = getRelatedSlugs(manifest, entry.slug, 3);
  const relatedEntries = relatedSlugs
    .map((slug) => manifestBySlug.get(slug))
    .filter(Boolean);

  if (relatedEntries.length === 0) {
    skipped++;
    continue;
  }

  md = ensureRelatedSection(md, relatedEntries);

  if (countBlogLinks(md) < 2 && relatedEntries.length >= 2) {
    const [first, second] = relatedEntries;
    if (!md.includes(`/blog/${first.slug}`)) {
      md += `\n\nFor more guidance, see [${first.title}](/blog/${first.slug}).`;
    }
    if (!md.includes(`/blog/${second.slug}`)) {
      md += `\n\nYou may also like [${second.title}](/blog/${second.slug}).`;
    }
  }

  if (md !== before) {
    fs.writeFileSync(filePath, md, "utf8");
    updated++;
  }
}

console.log(`Updated ${updated} blog posts. Skipped ${skipped} with no cluster siblings.`);
