"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import BookingModal from "./BookingModal";

function isBookHash() {
  return typeof window !== "undefined" && window.location.hash === "#book";
}

function clearBookHash() {
  if (!isBookHash()) return;
  const url = window.location.pathname + window.location.search;
  window.history.replaceState(null, "", url);
}

interface BookingContextValue {
  openBooking: () => void;
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

export default function BookingProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openBooking = useCallback(() => setIsOpen(true), []);
  const closeBooking = useCallback(() => {
    setIsOpen(false);
    clearBookHash();
  }, []);

  useEffect(() => {
    const syncFromHash = () => {
      if (isBookHash()) setIsOpen(true);
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <BookingContext.Provider value={{ openBooking, closeBooking, isBookingOpen: isOpen }}>
      {children}
      <BookingModal isOpen={isOpen} onClose={closeBooking} />
    </BookingContext.Provider>
  );
}
