interface BookButtonProps {
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export default function BookButton({
  onClick,
  className = "",
  children = "Book Online Now",
}: BookButtonProps) {
  return (
    <button type="button" onClick={onClick} className={`barkbus-btn ${className}`}>
      {children}
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </button>
  );
}
