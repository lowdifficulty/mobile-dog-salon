"use client";

import { useState } from "react";
import Link from "next/link";
import { PHONE_HREF, PHONE_NUMBER, SMS_HREF } from "@/lib/constants";

interface HeaderProps {
  onBookClick?: () => void;
}

export default function Header({ onBookClick }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="barkbus-container">
        <div className="flex items-center justify-between h-16 md:h-[72px]">
          <Link href="/" className="flex items-center shrink-0">
            <span className="font-heading font-bold text-2xl md:text-3xl text-gray-900 leading-tight">
              Mobile Dog Salon
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            <Link href="#locations" className="text-sm font-medium text-gray-700 hover:text-blue">
              Locations
            </Link>
            <Link href="#careers" className="text-sm font-medium text-gray-700 hover:text-blue">
              Careers
            </Link>
            <div className="flex items-center gap-1 text-sm text-gray-700">
              <a href={PHONE_HREF} className="font-medium hover:text-blue">Call</a>
              <span className="text-gray-400">or</span>
              <a href={SMS_HREF} className="font-medium hover:text-blue">text</a>
              <a href={PHONE_HREF} className="font-semibold text-gray-900 hover:text-blue ml-1">
                {PHONE_NUMBER}
              </a>
            </div>
            <button
              onClick={onBookClick}
              className="text-sm font-medium text-gray-700 hover:text-blue"
            >
              Login
            </button>
            <button onClick={onBookClick} className="barkbus-btn text-sm !py-2.5 !px-5">
              Book Now
            </button>
          </nav>

          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={onBookClick} className="barkbus-btn text-sm !py-2 !px-4">
              Book
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-gray-700"
              aria-label="Menu"
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
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <nav className="barkbus-container py-4 flex flex-col gap-3">
            <Link href="/" className="text-sm font-medium text-gray-800" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <button onClick={() => { onBookClick?.(); setMenuOpen(false); }} className="text-sm font-medium text-gray-800 text-left">
              Book Now
            </button>
            <Link href="#locations" className="text-sm font-medium text-gray-800" onClick={() => setMenuOpen(false)}>
              Locations
            </Link>
            <Link href="#careers" className="text-sm font-medium text-gray-800" onClick={() => setMenuOpen(false)}>
              Careers
            </Link>
            <Link href="#about" className="text-sm font-medium text-gray-800" onClick={() => setMenuOpen(false)}>
              About
            </Link>
            <Link href="#faq" className="text-sm font-medium text-gray-800" onClick={() => setMenuOpen(false)}>
              FAQ
            </Link>
            <a href={PHONE_HREF} className="text-sm font-medium text-gray-800">{PHONE_NUMBER}</a>
          </nav>
        </div>
      )}
    </header>
  );
}
