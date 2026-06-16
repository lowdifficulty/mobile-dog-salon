import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export default function Careers() {
  return (
    <section id="careers" className="site-section bg-brand text-white">
      <div className="site-container text-center max-w-3xl">
        <h2 className="font-bold text-2xl md:text-3xl mb-4">
          Join the <span className="text-accent">Mobile Dog Salon</span> Team
        </h2>
        <p className="text-white/80 text-lg leading-relaxed mb-8">
          Love animals? Build a career that loves you back. We&apos;re always looking for talented,
          compassionate groomers who want to deliver real value — to pets, families, and your
          future.
        </p>
        <Link
          href={ROUTES.careers}
          className="site-btn inline-flex"
        >
          Learn more
        </Link>
      </div>
    </section>
  );
}
