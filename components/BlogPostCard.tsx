"use client";

import Link from "next/link";
import BookableImage from "./BookableImage";
import { blogPostPath } from "@/lib/blog-public";
import type { BlogPostMeta } from "@/lib/blog-types";

export default function BlogPostCard({
  post,
  bookableImage = true,
  imageHeightClass = "h-[250px]",
}: {
  post: BlogPostMeta;
  bookableImage?: boolean;
  imageHeightClass?: string;
}) {
  return (
    <article className="site-card group overflow-hidden h-full flex flex-col">
      <div className={`aspect-[3/2] overflow-hidden ${imageHeightClass}`}>
        <BookableImage
          src={post.image}
          alt={post.imageAlt ?? post.title}
          bookable={bookableImage}
          className="img-blog w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <Link href={blogPostPath(post.slug)} className="block p-5 border-t-4 border-accent flex-1">
        <p className="text-xs font-semibold text-accent mb-2">By {post.author}</p>
        <h3 className="font-bold text-brand mb-2 leading-snug">{post.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
        <span className="site-link text-sm">Read More &gt;</span>
      </Link>
    </article>
  );
}
