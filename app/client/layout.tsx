import LickyChatWidget from "@/components/client/LickyChatWidget";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LickyChatWidget />
    </>
  );
}
