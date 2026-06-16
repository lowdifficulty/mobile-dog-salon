import Link from "next/link";

interface HeaderProps {
  onBookClick?: () => void;
}

export default function Header({ onBookClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-blue rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <svg
                className="w-6 h-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4.5 9.5C4.5 6.462 7.462 3.5 10.5 3.5S16.5 6.462 16.5 9.5c0 2.2-1.4 4.1-3.4 4.8-.3.1-.6.2-.9.2s-.6-.1-.9-.2C5.9 13.6 4.5 11.7 4.5 9.5z" />
                <path d="M10.5 14.5c-3.5 0-6.5 2.5-7.5 6h15c-1-3.5-4-6-7.5-6z" />
              </svg>
            </div>
            <div>
              <span className="font-display font-bold text-lg text-gray-900 leading-tight">
                Mobile Dog Salon
              </span>
              <span className="block text-xs text-blue font-medium">
                Orange County
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            <Link
              href="#services"
              className="text-sm font-medium text-gray-600 hover:text-blue transition-colors"
            >
              Services
            </Link>
            <Link
              href="#locations"
              className="text-sm font-medium text-gray-600 hover:text-blue transition-colors"
            >
              Locations
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-gray-600 hover:text-blue transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="#about"
              className="text-sm font-medium text-gray-600 hover:text-blue transition-colors"
            >
              About
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={onBookClick}
              className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-blue text-white text-sm font-semibold rounded-full hover:bg-blue-600 transition-colors shadow-md hover:shadow-lg"
            >
              Book Now
            </button>
            <button
              onClick={onBookClick}
              className="sm:hidden px-4 py-2 bg-blue text-white text-sm font-semibold rounded-full"
            >
              Book
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
