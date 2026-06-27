import type { MetadataRoute } from "next";
import { getBlogListings } from "@/lib/blog-loader";
import { ROUTES } from "@/lib/routes";
import { SITE_URL } from "@/lib/site-url";

const PER_PAGE = 12;

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: ROUTES.home, priority: 1, changeFrequency: "weekly" },
  { path: ROUTES.book, priority: 0.9, changeFrequency: "weekly" },
  { path: ROUTES.bookCats, priority: 0.85, changeFrequency: "weekly" },
  { path: ROUTES.services, priority: 0.85, changeFrequency: "monthly" },
  { path: ROUTES.mobileSpa, priority: 0.8, changeFrequency: "monthly" },
  { path: ROUTES.bathing, priority: 0.8, changeFrequency: "monthly" },
  { path: ROUTES.nails, priority: 0.8, changeFrequency: "monthly" },
  { path: ROUTES.deshedding, priority: 0.8, changeFrequency: "monthly" },
  { path: ROUTES.about, priority: 0.75, changeFrequency: "monthly" },
  { path: ROUTES.ourGroomers, priority: 0.7, changeFrequency: "monthly" },
  { path: ROUTES.ourVans, priority: 0.7, changeFrequency: "monthly" },
  { path: ROUTES.reviews, priority: 0.75, changeFrequency: "weekly" },
  { path: ROUTES.careers, priority: 0.65, changeFrequency: "monthly" },
  { path: ROUTES.franchise, priority: 0.8, changeFrequency: "monthly" },
  { path: ROUTES.locations, priority: 0.75, changeFrequency: "monthly" },
  { path: ROUTES.howItWorks, priority: 0.7, changeFrequency: "monthly" },
  { path: ROUTES.why, priority: 0.7, changeFrequency: "monthly" },
  { path: ROUTES.blog, priority: 0.8, changeFrequency: "daily" },
  { path: ROUTES.contact, priority: 0.7, changeFrequency: "monthly" },
  { path: ROUTES.privacy, priority: 0.3, changeFrequency: "yearly" },
  { path: ROUTES.terms, priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const posts = getBlogListings();
  const totalPages = Math.ceil(posts.length / PER_PAGE);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const blogIndexPages: MetadataRoute.Sitemap = Array.from({ length: totalPages }, (_, i) => {
    const page = i + 1;
    return {
      url: page === 1 ? `${SITE_URL}/blog` : `${SITE_URL}/blog?page=${page}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    };
  });

  const blogPosts: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...blogIndexPages, ...blogPosts];
}
