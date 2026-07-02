"use client";

import { useEffect, useState } from "react";
import BookingFlowForm from "@/components/booking/BookingFlowForm";
import BookingFormCard from "@/components/booking/BookingFormCard";
import {
  getBookingVariant,
  parseBookingHash,
  type BookingVariantId,
} from "@/lib/booking/variants";

export default function BookPageForm() {
  const [variantId, setVariantId] = useState<BookingVariantId>("default");

  useEffect(() => {
    const sync = () => setVariantId(parseBookingHash(window.location.hash));
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
