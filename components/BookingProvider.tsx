"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import BookingModal from "./BookingModal";
import {
  getBookingVariant,
  isBookingHash,
  resolveBookingVariantFromPath,
  resolveBookingVariantId,
  type BookingVariant,
  type BookingVariantId,
} from "@/lib/booking/variants";

function clearBookingHash() {
  if (typeof window === "undefined") return;
  if (!isBookingHash(window.location.hash)) return;
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

  const openBooking = useCallback((explicitVariant?: BookingVariantId) => {
    const variantId =
      explicitVariant && explicitVariant !== "default"
        ? explicitVariant
        : resolveBookingVariantFromPath(window.location.pathname);
    setVariant(variantFromId(variantId));
    setIsOpen(true);
  }, []);

  const closeBooking = useCallback(() => {
    setIsOpen(false);
    setVariant(null);
    clearBookingHash();
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash;
      if (!isBookingHash(hash)) return;
      const variantId = resolveBookingVariantId(window.location.pathname, hash);
      setVariant(variantFromId(variantId));
      setIsOpen(true);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <BookingContext.Provider value={{ openBooking, closeBooking, isBookingOpen: isOpen }}>
      {children}
      <BookingModal isOpen={isOpen} onClose={closeBooking} variant={variant} />
    </BookingContext.Provider>
  );
}
