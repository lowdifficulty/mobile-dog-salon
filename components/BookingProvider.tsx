"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import BookingModal from "./BookingModal";
import {
  groomerLandingPathForHash,
  isGroomerAdLandingPath,
  resolveActiveBookingVariantId,
} from "@/lib/booking/territory-session";
import {
  getBookingVariant,
  isBookingHash,
  type BookingVariant,
  type BookingVariantId,
} from "@/lib/booking/variants";

function clearBookingHashFromUrl() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash.toLowerCase();
  if (!isBookingHash(hash)) return;
  const url = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", url);
}

interface BookingContextValue {
  openBooking: (variantId?: BookingVariantId) => void;
  closeBooking: () => void;
  isBookingOpen: boolean;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error("useBooking must be used within BookingProvider");
  }
  return ctx;
}

function variantFromId(variantId: BookingVariantId): BookingVariant | null {
  return getBookingVariant(variantId);
}

export default function BookingProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [variant, setVariant] = useState<BookingVariant | null>(null);

  const applyVariant = useCallback((variantId: BookingVariantId) => {
    setVariant(variantFromId(variantId));
  }, []);

  const openBooking = useCallback(
    (explicitVariant?: BookingVariantId) => {
      const variantId = resolveActiveBookingVariantId(
        window.location.pathname,
        window.location.hash,
        explicitVariant
      );
      applyVariant(variantId);
      setIsOpen(true);
    },
    [applyVariant]
  );

  const closeBooking = useCallback(() => {
    setIsOpen(false);
    clearBookingHashFromUrl();
    const variantId = resolveActiveBookingVariantId(window.location.pathname, "");
    setVariant(variantId === "default" ? null : variantFromId(variantId));
  }, []);

  useEffect(() => {
    const openForLanding = (pathname: string) => {
      const variantId = resolveActiveBookingVariantId(pathname, "");
      if (variantId === "default") return;
      applyVariant(variantId);
      setIsOpen(true);
    };

    const syncFromUrl = () => {
      const pathname = window.location.pathname;
      const hash = window.location.hash.toLowerCase();

      const groomerLanding = groomerLandingPathForHash(hash);
      if (groomerLanding) {
        window.history.replaceState(null, "", groomerLanding);
        openForLanding(groomerLanding);
        return;
      }

      if (isGroomerAdLandingPath(pathname)) {
        openForLanding(pathname);
        return;
      }

      if (!isBookingHash(hash)) return;

      const variantId = resolveActiveBookingVariantId(pathname, hash);
      applyVariant(variantId);
      setIsOpen(true);
    };

    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    return () => window.removeEventListener("hashchange", syncFromUrl);
  }, [applyVariant]);

  return (
    <BookingContext.Provider value={{ openBooking, closeBooking, isBookingOpen: isOpen }}>
      {children}
      <BookingModal isOpen={isOpen} onClose={closeBooking} variant={variant} />
    </BookingContext.Provider>
  );
}
