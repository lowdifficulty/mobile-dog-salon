import LickyChatWidget from "@/components/client/LickyChatWidget";
import { isLickyEnabled } from "@/lib/client/licky-enabled";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {isLickyEnabled() ? <LickyChatWidget /> : null}
    </>
  );
}
