"use client";

import Link from "next/link";
import BookableImage from "./BookableImage";
import { blogPostPath } from "@/lib/blog-public";
import type { BlogPostMeta } from "@/lib/blog-types";

export default function BlogListingCard({
  post,
  bookableImage = true,
}: {
  post: BlogPostMeta;
  bookableImage?: boolean;
}) {
  return (
    <article className="site-card overflow-hidden h-full flex flex-col">
      <div className="relative h-[220px] overflow-hidden">
        <BookableImage
          src={post.image}
          alt={post.imageAlt ?? post.title}
          bookable={bookableImage}
          className="img-blog w-full h-full"
        />
      </div>
      <Link href={blogPostPath(post.slug)} className="block p-5 border-t-4 border-accent flex-1">
        <p className="text-xs font-semibold text-accent mb-2">By {post.author}</p>
        <h2 className="font-bold text-brand mb-2 leading-snug text-lg">{post.title}</h2>
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">{post.excerpt}</p>
        <p className="text-xs text-gray-400 mb-2">
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
        <span className="site-link text-sm">Read More &gt;</span>
      </Link>
    </article>
  );
}
