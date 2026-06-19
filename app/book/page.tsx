import BookingFlowForm from "@/components/booking/BookingFlowForm";
import BookingFormCard from "@/components/booking/BookingFormCard";
import BookPageBackButton from "@/components/book/BookPageBackButton";

export const metadata = {
  title: "Book an Appointment | Mobile Dog Salon",
  description: "Book your mobile dog grooming appointment in Orange County.",
};

export default function BookPage() {
  return (
    <div className="min-h-[100dvh] bg-book-spa flex items-center justify-center p-4">
      <BookPageBackButton />
      <BookingFormCard>
        <BookingFlowForm />
      </BookingFormCard>
    </div>
  );
}
