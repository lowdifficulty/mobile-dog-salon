import BookButton from "./BookButton";

interface CTAProps {
  onBookClick: () => void;
}

export default function CTA({ onBookClick }: CTAProps) {
  return (
    <section className="barkbus-section bg-white">
      <div className="barkbus-container text-center max-w-3xl">
        <h2 className="barkbus-heading mb-8">
          Book your &ldquo;spaw&rdquo; day now!
        </h2>
        <BookButton onClick={onBookClick} />
      </div>
    </section>
  );
}
