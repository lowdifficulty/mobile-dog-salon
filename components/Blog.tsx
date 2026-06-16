import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { blogPostPath, BLOG_POSTS } from "@/lib/blog-public";

export default function Blog() {
  return (
    <section id="blog" className="site-section bg-section-pattern-white">
      <div className="site-container">
        <h2 className="site-heading-section mb-12">
          <span className="site-heading-pink">Paw-some</span> Reads
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} href={blogPostPath(post.slug)} className="block h-full">
              <article className="site-card group overflow-hidden h-full">
                <div className="aspect-[3/2] overflow-hidden h-[250px]">
                  <img
                    src={post.image}
                    alt={post.imageAlt ?? post.title}
                    className="img-blog w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5 border-t-4 border-accent">
                  <p className="text-xs font-semibold text-accent mb-2">By {post.author}</p>
                  <h3 className="font-bold text-brand mb-2 leading-snug">{post.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                  <span className="site-link text-sm">Read More &gt;</span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        <p className="text-center">
          <Link href={ROUTES.blog} className="site-link">Read Our Blog</Link>
        </p>
      </div>
    </section>
  );
}
