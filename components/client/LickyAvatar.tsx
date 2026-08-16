import { LICKY_AVATAR } from "@/lib/client/portal";

/** White ring around the original Licky Chihuahua photo. */
const LICKY_AVATAR_RING = "#FFFFFF";

/** Original Licky Chihuahua photo inside a white circle. */
export default function LickyAvatar({
  size = 40,
  className = "",
  alt = "Licky",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full p-[2px] shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: LICKY_AVATAR_RING }}
    >
      <img
        src={LICKY_AVATAR}
        alt={alt}
        className="w-full h-full rounded-full object-cover"
      />
    </span>
  );
}
