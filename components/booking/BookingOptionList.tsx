import type { ReactNode } from "react";

interface BookingOptionListProps {
  children: ReactNode;
}

/** Side-by-side tappable option cards. */
export default function BookingOptionList({ children }: BookingOptionListProps) {
  return <div className="flex gap-2 sm:gap-3">{children}</div>;
}
