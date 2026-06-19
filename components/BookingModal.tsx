"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BookingFlowForm from "@/components/booking/BookingFlowForm";
import BookingFormCard from "@/components/booking/BookingFormCard";
import { lockPageScroll } from "@/lib/scroll-lock";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [mounted, setMounted] = useState(false);
  const ignoreBackdropClose = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    ignoreBackdropClose.current = true;
    const unlockBackdrop = window.setTimeout(() => {
      ignoreBackdropClose.current = false;
    }, 100);

    const unlockScroll = lockPageScroll();

    return () => {
      window.clearTimeout(unlockBackdrop);
      unlockScroll();
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
        onMouseDown={() => {
          if (!ignoreBackdropClose.current) onClose();
        }}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-lg"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Book an appointment"
      >
        <BookingFormCard>
          <BookingFlowForm onClose={onClose} funnelViewSource="booking_modal" />
        </BookingFormCard>
      </div>
    </div>,
    document.body
  );
}
