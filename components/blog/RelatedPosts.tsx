import Link from "next/link";
import { blogPostPath } from "@/lib/blog-public";
import type { BlogPostMeta } from "@/lib/blog-types";
import { ROUTES } from "@/lib/routes";

const SITE_LINKS: { href: string; label: string }[] = [
  { href: ROUTES.book, label: "Book a mobile grooming appointment" },
  { href: ROUTES.services, label: "View our grooming services" },
  { href: ROUTES.locations, label: "Mobile dog grooming locations" },
  { href: ROUTES.howItWorks, label: "How mobile grooming works" },
  { href: ROUTES.reviews, label: "Read customer reviews" },
  { href: ROUTES.contact, label: "Contact Mobile Dog Salon" },
];

export default function RelatedPosts({
  posts,
  currentSlug,
}: {
  posts: BlogPostMeta[];
  currentSlug: string;
}) {
  if (posts.length === 0) return null;

  const siteLinks = SITE_LINKS.filter((link) => link.href !== `/blog/${currentSlug}`).slice(0, 2);

  return (
    <aside className="max-w-3xl mx-auto mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-lg font-bold text-brand mb-4">Related articles</h2>
      <ul className="space-y-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={blogPostPath(post.slug)} className="site-link font-semibold text-sm leading-snug">
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
      {siteLinks.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-gray-700 mt-6 mb-3">On Mobile Dog Salon</h3>
          <ul className="space-y-2">
            {siteLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="site-link text-sm">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
