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
