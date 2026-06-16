import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarkdownBody from "@/components/blog/MarkdownBody";
import CareersCTA from "@/components/pages/PageCTAs";
import { ROUTES } from "@/lib/routes";
import { getAllBlogSlugs, getBlogPost } from "@/lib/blog-loader";

const SITE_URL = "https://mobiledog-salon.com";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return { title: "Blog | Mobile Dog Salon" };

  const imageUrl = post.image.startsWith("http") ? post.image : `${SITE_URL}${post.image}`;
  const pageUrl = `${SITE_URL}/blog/${slug}`;

  return {
    title: post.metaTitle,
    description: post.metaDescription,
    keywords: post.primaryKeyword,
    authors: [{ name: post.author }],
    alternates: { canonical: pageUrl },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      type: "article",
      url: pageUrl,
      publishedTime: post.publishedAt,
      authors: [post.author],
      siteName: "Mobile Dog Salon",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.imageAlt ?? post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.metaTitle,
      description: post.metaDescription,
      images: [imageUrl],
    },
  };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  return (
    <>
      <section className="site-section bg-section-hero">
        <div className="site-container max-w-3xl">
          <Link href={ROUTES.blog} className="text-sm font-semibold text-accent hover:text-brand mb-6 inline-block">
            ← Back to Blog
          </Link>
          <p className="text-xs font-bold text-accent uppercase tracking-wide mb-2">{post.category}</p>
          <h1 className="site-heading-hero mb-4">{post.title}</h1>
          <p className="text-gray-600 text-sm">
            By <span className="font-semibold text-brand">{post.author}</span>
            <span className="mx-2">·</span>
            {formatDate(post.publishedAt)}
          </p>
        </div>
      </section>

      <section className="site-section bg-section-white">
        <div className="site-container">
          <div className="max-w-3xl mx-auto mb-10">
            <img
              src={post.image}
              alt={post.imageAlt ?? post.title}
              className="img-blog w-full aspect-[16/9] shadow-md ring-4 ring-accent/10"
            />
          </div>
          <MarkdownBody content={post.content} />
        </div>
      </section>

      <CareersCTA />
    </>
  );
}
