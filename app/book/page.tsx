import BookPageForm from "@/components/booking/BookPageForm";
import BookPageBackButton from "@/components/book/BookPageBackButton";

export const metadata = {
  title: "Book an Appointment | Mobile Dog Salon",
  description: "Book your mobile dog grooming appointment in Orange County.",
};

export default function BookPage() {
  return (
    <div className="min-h-[100dvh] bg-book-spa flex items-center justify-center p-4">
      <BookPageBackButton />
      <BookPageForm />
    </div>
  );
}
