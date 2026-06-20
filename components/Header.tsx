"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ABOUT, NAV_COMPANY, NAV_SERVICES, ROUTES } from "@/lib/routes";
import { isA2PVerificationPage } from "@/lib/a2p-page";
import { useBooking } from "./BookingProvider";

function NavDropdown({
  label,
  items,
  menuId,
  openMenu,
  setOpenMenu,
}: {
  label: string;
  items: { label: string; href: string }[];
  menuId: string;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
}) {
  const open = openMenu === menuId;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, setOpenMenu]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpenMenu(open ? null : menuId)}
        className="flex items-center gap-1 text-sm font-semibold text-brand hover:text-accent transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={`nav-menu-${menuId}`}
        id={`nav-trigger-${menuId}`}
      >
        {label}
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 pt-2 z-50" id={`nav-menu-${menuId}`} role="menu" aria-labelledby={`nav-trigger-${menuId}`}>
          <div className="w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-accent-light hover:text-accent"
                onClick={() => setOpenMenu(null)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileNavSection({
  title,
  items,
  onNavigate,
}: {
  title: string;
  items: { label: string; href: string }[];
  onNavigate: () => void;
}) {
  return (
    <>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mt-2 first:mt-0">{title}</p>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-sm font-medium text-gray-800 hover:text-accent"
          onClick={onNavigate}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export default function Header() {
  const pathname = usePathname();
  const hideBookingUi = isA2PVerificationPage(pathname);
  const companyNav = useMemo(
    () =>
      hideBookingUi
        ? NAV_COMPANY.filter((item) => item.href !== ROUTES.book)
        : NAV_COMPANY,
    [hideBookingUi]
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { openBooking } = useBooking();

  const closeMobile = () => setMenuOpen(false);

  const handleSetOpenMenu = (id: string | null) => {
    setOpenMenu(id);
    if (id) setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_2px_2px_#F4F4F4]">
      <div className="site-container">
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          <Link href={ROUTES.home} className="flex flex-col shrink-0">
            <span className="font-bold text-xl md:text-2xl text-brand leading-tight">
              Mobile Dog <span className="text-accent-hot">Salon</span>
            </span>
            <span className="text-[10px] md:text-xs font-script text-brand -mt-0.5 hidden sm:block">
              Good Dogs Take Baths
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-5">
            <NavDropdown
              label="About"
              items={NAV_ABOUT}
              menuId="about"
              openMenu={openMenu}
              setOpenMenu={handleSetOpenMenu}
            />
            <NavDropdown
              label="Services"
              items={NAV_SERVICES}
              menuId="services"
              openMenu={openMenu}
              setOpenMenu={handleSetOpenMenu}
            />
            <NavDropdown
              label="More"
              items={companyNav}
              menuId="more"
              openMenu={openMenu}
              setOpenMenu={handleSetOpenMenu}
            />
            <Link
              href={ROUTES.careers}
              className="text-sm font-semibold text-brand hover:text-accent transition-colors"
            >
              Careers
            </Link>
            {!hideBookingUi && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.requestAnimationFrame(() => openBooking());
                }}
                className="site-btn text-sm !py-2.5 !px-6"
              >
                Book an Appointment
              </button>
            )}
          </nav>

          <div className="flex items-center gap-3 lg:hidden">
            {!hideBookingUi && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.requestAnimationFrame(() => openBooking());
                }}
                className="site-btn text-sm !py-2 !px-4"
              >
                Book
              </button>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-brand"
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain scrollbar-grey">
          <nav className="site-container py-4 flex flex-col gap-3">
            <MobileNavSection title="About" items={NAV_ABOUT} onNavigate={closeMobile} />
            <MobileNavSection title="Services" items={NAV_SERVICES} onNavigate={closeMobile} />
            <MobileNavSection title="More" items={companyNav} onNavigate={closeMobile} />
            <Link
              href={ROUTES.careers}
              className="text-sm font-medium text-gray-800 hover:text-accent"
              onClick={closeMobile}
            >
              Careers
            </Link>
            {!hideBookingUi && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.requestAnimationFrame(() => {
                    openBooking();
                    closeMobile();
                  });
                }}
                className="site-btn text-sm w-full mt-2"
              >
                Book an Appointment
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
