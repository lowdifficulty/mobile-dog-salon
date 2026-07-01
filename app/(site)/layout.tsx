import SiteShell from "@/components/SiteShell";
import LickyChatWidget from "@/components/client/LickyChatWidget";
import { isLickyEnabled } from "@/lib/client/licky-enabled";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      {children}
      {isLickyEnabled() ? <LickyChatWidget /> : null}
    </SiteShell>
  );
}
