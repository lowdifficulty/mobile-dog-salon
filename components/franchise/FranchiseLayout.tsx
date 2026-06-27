import type { ReactNode } from "react";
import Link from "next/link";
import {
  FRANCHISE_ICON_MAP,
  type FranchiseIconName,
} from "@/components/franchise/FranchiseIcons";

export function FranchiseSectionHeader({
  title,
  subtitle,
  centered = true,
  className = "",
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div className={`${centered ? "text-center max-w-3xl mx-auto" : "max-w-3xl"} ${className}`}>
      <h2 className="site-heading-section mb-4">{title}</h2>
      {subtitle && (
        <p className="text-gray-600 text-lg leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

export function FranchisePillarCard({
  icon,
  title,
  description,
}: {
  icon: FranchiseIconName;
  title: string;
  description: string;
}) {
  const Icon = FRANCHISE_ICON_MAP[icon];

  return (
    <article className="group flex flex-col items-center text-center p-6 sm:p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-accent/25 transition-all">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 text-brand mb-5 group-hover:bg-brand group-hover:text-white transition-colors">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-bold text-brand text-lg mb-2 leading-snug">{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </article>
  );
}

export function FranchiseSupportTile({
  icon,
  title,
  description,
}: {
  icon: FranchiseIconName;
  title: string;
  description: string;
}) {
  const Icon = FRANCHISE_ICON_MAP[icon];

  return (
    <div className="flex gap-4 p-5 rounded-xl bg-white/90 border border-white shadow-sm">
      <div className="flex shrink-0 items-center justify-center w-11 h-11 rounded-xl bg-brand text-white">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-bold text-brand mb-1">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function FranchiseCTABand({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-hero-spa py-12 md:py-14 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0f2447]/10 pointer-events-none" />
      <div className="site-container relative text-center max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-white mb-3 drop-shadow-sm">{title}</h2>
        {description && (
          <p className="text-white/90 text-lg leading-relaxed mb-6 drop-shadow-sm">{description}</p>
        )}
        {children ?? (
          <Link href="#franchise-form" className="site-btn site-btn-hero">
            Request Franchise Information
          </Link>
        )}
      </div>
    </section>
  );
}
