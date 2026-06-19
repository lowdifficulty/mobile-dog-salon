"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ABOUT, NAV_COMPANY, NAV_SERVICES, ROUTES } from "@/lib/routes";
import { isA2PVerificationPage } from "@/lib/a2p-page";
import { useBooking } from "./BookingProvider";

export default function Footer() {
  const pathname = usePathname();
  const hideBookingUi = isA2PVerificationPage(pathname);
  const companyNav = hideBookingUi
    ? NAV_COMPANY.filter((item) => item.href !== ROUTES.book)
    : NAV_COMPANY;
  const { openBooking } = useBooking();

  return (
    <footer className="bg-brand text-white border-t-4 border-accent footer-bckgrnd">
      <div className="site-container py-12 md:py-16">
        <div className="text-center mb-10">
          {!hideBookingUi && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.requestAnimationFrame(() => openBooking());
              }}
              className="site-btn mb-6"
            >
              Book an Appointment
            </button>
          )}
          <p className="text-white/60 text-sm">
            <Link href={ROUTES.careers} className="hover:text-accent transition-colors">
              START A MOBILE GROOMING CAREER &gt;
            </Link>
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide mb-4 text-white/60">About</h3>
            <ul className="space-y-2">
              {NAV_ABOUT.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-white/80 hover:text-accent transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide mb-4 text-white/60">Services</h3>
            <ul className="space-y-2">
              {NAV_SERVICES.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-white/80 hover:text-accent transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide mb-4 text-white/60">Company</h3>
            <ul className="space-y-2">
              {companyNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-white/80 hover:text-accent transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm uppercase tracking-wide mb-4 text-white/60">Locations</h3>
            <ul className="space-y-2">
              <li>
                <Link href={ROUTES.locations} className="text-sm text-white/80 hover:text-accent transition-colors">
                  Orange County, CA
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center">
          <Link href={ROUTES.home} className="font-bold text-xl text-white mb-4 inline-block">
            Mobile Dog Salon
          </Link>
          <p className="text-xs text-white/50">
            Copyright {new Date().getFullYear()} © Mobile Dog Salon.{" "}
            <Link href={ROUTES.privacy} className="hover:text-accent">Privacy Policy</Link>
            {" · "}
            <Link href={ROUTES.terms} className="hover:text-accent">Terms &amp; Conditions</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
