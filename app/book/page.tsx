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
      <header className="bg-white shadow-[0_2px_2px_#F4F4F4]">
        <div className="site-container py-4 flex items-center justify-between">
          <Link href={ROUTES.home} className="flex items-center gap-3">
            <img src="/images/branding-ad.png" alt="Good Dogs Take Baths" className="h-12 w-auto rounded-sticker" />
            <span className="font-bold text-brand hidden sm:block">Book a Bath</span>
          </Link>
          <Link href={ROUTES.home} className="text-sm text-gray-500 hover:text-accent transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      <div className="site-container py-8 max-w-lg mx-auto">
        <h1 className="site-heading-on-pink text-center mb-2">Book an Appointment</h1>
        <p className="text-center text-on-pink-muted mb-8">
          Schedule mobile grooming at your curb in Orange County.
        </p>
        <div className="bg-white rounded-[30px] shadow-xl overflow-hidden border border-accent/10">
          <BookPageForm />
        </div>
      </div>
    </div>
  );
}
