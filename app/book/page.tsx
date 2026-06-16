import BookingForm from "@/components/BookingForm";
import Link from "next/link";

export const metadata = {
  title: "Book an Appointment | Mobile Dog Salon",
  description: "Book your mobile dog grooming appointment in Orange County.",
};

export default function BookPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.5 9.5C4.5 6.462 7.462 3.5 10.5 3.5S16.5 6.462 16.5 9.5c0 2.2-1.4 4.1-3.4 4.8-.3.1-.6.2-.9.2s-.6-.1-.9-.2C5.9 13.6 4.5 11.7 4.5 9.5z" />
              </svg>
            </div>
            <span className="font-display font-bold text-gray-900">Mobile Dog Salon</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-blue transition-colors">
            Back to Home
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <BookingForm />
        </div>
      </div>
    </div>
  );
}
