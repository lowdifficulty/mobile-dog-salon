import CatBookingFlowForm from "@/components/booking/CatBookingFlowForm";
import BookingFormCard from "@/components/booking/BookingFormCard";
import BookPageBackButton from "@/components/book/BookPageBackButton";

export const metadata = {
  title: "Book Cat Grooming | Mobile Dog Salon",
  description: "Book mobile cat grooming in Orange County — bath, brush, nails, and haircuts at your home.",
};

export default function BookCatsPage() {
  return (
    <div className="min-h-[100dvh] bg-book-spa flex items-center justify-center p-4">
      <BookPageBackButton />
      <BookingFormCard>
        <CatBookingFlowForm />
      </BookingFormCard>
    </div>
  );
}
