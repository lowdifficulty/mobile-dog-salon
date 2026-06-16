import manifestData from "../data/blog-manifest.json";
import type { BlogPostMeta } from "./blog-types";

export function blogPostPath(slug: string): string {
  return `/blog/${slug}`;
}

/** Latest posts for homepage (client-safe, no fs) */
export const BLOG_POSTS = [...(manifestData as BlogPostMeta[])]
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  .slice(0, 3);

export const BLOG_MANIFEST = manifestData as BlogPostMeta[];
