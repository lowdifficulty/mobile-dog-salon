import Link from "next/link";
import { BOOKING_URL } from "@/lib/constants";

interface FooterProps {
  onBookClick?: () => void;
}

export default function Footer({ onBookClick }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-blue rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M4.5 9.5C4.5 6.462 7.462 3.5 10.5 3.5S16.5 6.462 16.5 9.5c0 2.2-1.4 4.1-3.4 4.8-.3.1-.6.2-.9.2s-.6-.1-.9-.2C5.9 13.6 4.5 11.7 4.5 9.5z" />
                  <path d="M10.5 14.5c-3.5 0-6.5 2.5-7.5 6h15c-1-3.5-4-6-7.5-6z" />
                </svg>
              </div>
              <span className="font-display font-bold text-xl">Mobile Dog Salon</span>
            </div>
            <p className="text-gray-400 text-sm max-w-sm">
              Premium mobile dog grooming that comes to your doorstep throughout
              Orange County. One-on-one, stress-free, cage-free grooming.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="#services" className="hover:text-blue transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link href="#locations" className="hover:text-blue transition-colors">
                  Locations
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-blue transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="#about" className="hover:text-blue transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Book Now</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <button
                  onClick={onBookClick}
                  className="hover:text-blue transition-colors"
                >
                  Book an Appointment
                </button>
              </li>
              <li>
                <a
                  href={BOOKING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue transition-colors"
                >
                  Online Booking Portal
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Mobile Dog Salon. All rights reserved.</p>
          <p>Serving Orange County, California</p>
        </div>
      </div>
    </footer>
  );
}
