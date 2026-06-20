import "server-only";
import fs from "fs";
import path from "path";
import type { BlogPost, BlogPostMeta } from "./blog-types";
import { BLOG_MANIFEST } from "./blog-public";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

export function getAllBlogSlugs(): string[] {
  return BLOG_MANIFEST.map((p) => p.slug);
}

export function getBlogPost(slug: string): BlogPost | undefined {
  const meta = BLOG_MANIFEST.find((p) => p.slug === slug);
  if (!meta) return undefined;

  const file = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return undefined;

  const content = fs.readFileSync(file, "utf8");
  return { ...meta, content };
}

export function getBlogListings(): BlogPostMeta[] {
  return [...BLOG_MANIFEST].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function extractLocalSeoCluster(slug: string): string | null {
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

function breedGroupNumber(blogNumber: number): number {
  return Math.floor((blogNumber - 101) / 5);
}

/** Up to `limit` sibling posts for internal linking (same breed cluster or local SEO area). */
export function getRelatedPosts(slug: string, limit = 3): BlogPostMeta[] {
  const post = BLOG_MANIFEST.find((entry) => entry.slug === slug);
  if (!post) return [];

  const related = BLOG_MANIFEST.filter((candidate) => {
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
  });

  return related
    .sort((a, b) => a.blog_number - b.blog_number)
    .slice(0, limit);
}
