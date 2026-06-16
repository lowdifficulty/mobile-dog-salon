import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import BookButton from "../BookButton";

export default function CareersCTA() {
  return (
    <section className="site-section bg-section-tan">
      <div className="site-container text-center max-w-3xl mx-auto">
        <h2 className="site-heading-section mb-4">
          Join the <span className="site-heading-pink">Mobile Dog Salon</span> Team
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed mb-8">
          Love animals? Build a career that loves you back. We&apos;re always looking for talented,
          compassionate groomers across Orange County.
        </p>
        <Link href={ROUTES.careers} className="site-btn inline-flex">
          Learn more
        </Link>
      </div>
    </section>
  );
}

export function LocationsCTA() {
  return (
    <section className="site-section bg-section-pattern-blue">
      <div className="site-container text-center max-w-3xl mx-auto">
        <h2 className="site-heading-section mb-4">
          Everywhere <span className="site-heading-pink">Pets Need Us</span>
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed mb-8">
          We serve neighborhoods across Orange County — bringing calm, clean mobile pet grooming
          care to your curb.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <BookButton />
          <Link href={ROUTES.locations} className="site-btn-outline">
            View Locations
          </Link>
        </div>
      </div>
    </section>
  );
}
