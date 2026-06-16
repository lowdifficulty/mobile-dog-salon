import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/pages/PageHero";
import BlogListingCard from "@/components/BlogListingCard";
import { getBlogListings } from "@/lib/blog-loader";
import CareersCTA from "@/components/pages/PageCTAs";

export const metadata: Metadata = {
  title: "Blog | Mobile Dog Salon",
  description:
    "Pet care tips and grooming advice from Hattie Pup — mobile dog grooming across Orange County.",
};

const PER_PAGE = 12;

type PageProps = { searchParams: Promise<{ page?: string }> };

export default async function BlogPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const all = getBlogListings();
  const totalPages = Math.ceil(all.length / PER_PAGE);
  const posts = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <PageHero
        title={<><span className="site-heading-pink">Paw-some</span> Reads</>}
        subtitle="Tips, tricks, and pet care advice from Hattie Pup — Good Dogs Take Baths!"
        background="pattern-white"
      />
      <section className="site-section bg-section-white">
        <div className="site-container">
          <p className="text-center text-gray-600 mb-10">
            {all.length} articles on mobile grooming, Orange County pet care, and breed-specific tips.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => (
              <BlogListingCard key={post.slug} post={post} bookableImage={index % 2 === 0} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12 flex-wrap">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={p === 1 ? "/blog" : `/blog?page=${p}`}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border ${
                    p === page
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-brand border-gray-200 hover:border-accent"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <CareersCTA />
    </>
  );
}
