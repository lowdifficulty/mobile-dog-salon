import BookPageForm from "@/components/book/BookPageForm";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "Book an Appointment | Mobile Dog Salon",
  description: "Book your mobile dog grooming appointment in Orange County.",
};

export default function BookPage() {
  return (
    <div className="min-h-screen bg-section-pink">
      <header className="bg-white shadow-[0_1px_0_#F4F4F4]">
        <div className="site-container py-2 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <img
              src="/images/branding-ad.png"
              alt="Good Dogs Take Baths"
              className="h-8 w-auto rounded-sticker"
            />
            <span className="text-sm font-semibold text-brand hidden sm:block">Book</span>
          </Link>
          <Link href={ROUTES.home} className="text-xs text-gray-500 hover:text-accent transition-colors">
            Home
          </Link>
        </div>
      </header>

      <div className="site-container px-3 py-3 sm:px-4 sm:py-4 max-w-lg mx-auto w-full">
        <div className="bg-white rounded-2xl sm:rounded-[24px] shadow-xl overflow-hidden border border-accent/10">
          <BookPageForm />
        </div>
      </div>
    </div>
  );
}
