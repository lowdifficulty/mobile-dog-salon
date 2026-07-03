/** Shared shell so /book and the booking modal render identically. */
export default function BookingFormCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`booking-form-card w-full max-w-lg max-h-[90dvh] overflow-y-auto scrollbar-grey ${className}`.trim()}
    >
      {children}
    </div>
  );
}
