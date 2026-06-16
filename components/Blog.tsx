import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { blogPostPath, BLOG_POSTS } from "@/lib/blog-public";
import BlogPostCard from "./BlogPostCard";

export default function Blog() {
  return (
    <section id="blog" className="site-section bg-section-pattern-white">
      <div className="site-container">
        <h2 className="site-heading-section mb-12">
          <span className="site-heading-pink">Paw-some</span> Reads
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {BLOG_POSTS.map((post, index) => (
            <BlogPostCard key={post.slug} post={post} bookableImage={index % 2 === 0} />
          ))}
        </div>

        <p className="text-center">
          <Link href={ROUTES.blog} className="site-link">Read Our Blog</Link>
        </p>
      </div>
    </section>
  );
}
