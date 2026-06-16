import Link from "next/link";

interface FooterProps {
  onBookClick?: () => void;
}

export default function Footer({ onBookClick }: FooterProps) {
  const links = [
    { label: "Locations", href: "#locations" },
    { label: "Careers", href: "#careers" },
    { label: "About", href: "#about" },
    { label: "FAQ", href: "#faq" },
    { label: "Book Online", action: onBookClick },
  ];

  return (
    <footer className="bg-white border-t border-gray-200 py-12 md:py-16">
      <div className="barkbus-container">
        <div className="flex flex-col items-center text-center">
          <Link href="/" className="font-heading font-bold text-2xl text-gray-900 mb-8">
            Mobile Dog Salon
          </Link>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 mb-10">
            {links.map((link) =>
              link.action ? (
                <button
                  key={link.label}
                  type="button"
                  onClick={link.action}
                  className="text-sm text-gray-600 hover:text-blue transition-colors"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  href={link.href!}
                  className="text-sm text-gray-600 hover:text-blue transition-colors"
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          <p className="text-xs text-gray-500">
            Copyright {new Date().getFullYear()} © Mobile Dog Salon. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
