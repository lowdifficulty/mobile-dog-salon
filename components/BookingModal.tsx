"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import BookingFlowForm from "@/components/booking/BookingFlowForm";
import BookingFormCard from "@/components/booking/BookingFormCard";

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
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    ignoreBackdropClose.current = true;
    const unlockBackdrop = window.setTimeout(() => {
      ignoreBackdropClose.current = false;
    }, 100);

    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(unlockBackdrop);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
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
          <BookingFlowForm onClose={onClose} />
        </BookingFormCard>
      </div>
    </div>,
    document.body
  );
}
