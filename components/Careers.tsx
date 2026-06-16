import Link from "next/link";

export default function Careers() {
  return (
    <section id="careers" className="barkbus-section bg-white">
      <div className="barkbus-container text-center max-w-2xl">
        <p className="text-gray-600 mb-2">Obsessed with grooming?</p>
        <h2 className="barkbus-heading mb-8">Let&apos;s work together!</h2>
        <Link
          href="mailto:careers@mobiledog-salon.com"
          className="barkbus-btn"
        >
          Join The Team
        </Link>
      </div>
    </section>
  );
}
