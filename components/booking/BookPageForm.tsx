"use client";

import { useEffect, useState } from "react";
import BookingFlowForm from "@/components/booking/BookingFlowForm";
import BookingFormCard from "@/components/booking/BookingFormCard";
import { resolveActiveBookingVariantId } from "@/lib/booking/territory-session";
import { getBookingVariant, type BookingVariantId } from "@/lib/booking/variants";

export default function BookPageForm() {
  const [variantId, setVariantId] = useState<BookingVariantId>("default");

  useEffect(() => {
    const sync = () => {
      setVariantId(
        resolveActiveBookingVariantId(window.location.pathname, window.location.hash.toLowerCase())
      );
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const variant = getBookingVariant(variantId);

  return (
    <BookingFormCard>
      <BookingFlowForm variant={variant} />
    </BookingFormCard>
  );
}
