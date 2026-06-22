import type { ReactNode } from "react";

interface BookingOptionListProps {
  children: ReactNode;
}

/** Heyflow-style connected options in a horizontal row. */
export default function BookingOptionList({ children }: BookingOptionListProps) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-[#eaeaeb] bg-[#fafafb]">
      {children}
    </div>
  );
}
